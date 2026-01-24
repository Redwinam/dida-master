export const getDidaProjects = async (token: string) => {
  return await $fetch('https://api.dida365.com/open/v1/project', {
    headers: {
      Authorization: `Bearer ${token}`
    },
    timeout: 10000 // Add explicit timeout
  })
}

export const getDidaTasks = async (token: string, projectId: string) => {
  const data: any = await $fetch(`https://api.dida365.com/open/v1/project/${projectId}/data`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    timeout: 10000 // Add explicit timeout
  })
  return data?.tasks || []
}

export const getDidaCompletedTasks = async (token: string, projectId: string, fromDate: string, cookie?: string) => {
  // Use "all" closed tasks API found by user which seems to work better
  // https://api.dida365.com/api/v2/project/all/closed?from=&to=&status=Completed
  // We can filter by project ID on our side if needed, or check if it accepts projectId in path
  
  // The user shared: https://api.dida365.com/api/v2/project/all/closed
  // Let's try to fetch ALL completed tasks and filter by date and project
  // This seems to be the "Completed" smart list endpoint.
  
  // Note: V2 API usually requires Cookie auth, but some endpoints might work with Bearer if we are lucky.
  // User reported 401 with Bearer token on v2 endpoint.
  // If Bearer doesn't work, we are stuck unless we can simulate a cookie or use v1.
  // But v1 doesn't return completed tasks.
  
  // However, the user said: "刚才的接口不行... 这个V2端口要怎么接呢？" and provided a reddit link.
  // The reddit link suggests V2 API is internal and undocumented.
  // ticktick-py uses it by simulating a browser login (cookie).
  // But we are using OAuth token.
  
  // WAIT! If we are using OAuth token, maybe we can use the `open/v1/project/{id}/data` endpoint?
  // But documentation says it only returns 'tasks' (uncompleted).
  
  // Let's look at the error again: "Failed to fetch all closed tasks: 401".
  // This confirms Bearer token is NOT accepted by /api/v2/project/all/closed.
  
  // Is there any other way?
  // Maybe we can try `open/v1/project/{id}/data` again? 
  // Some users say "I didn't find a way to retrieve all the completed tasks" with v1.
  
  // What if we try to use the Cookie from the user? 
  // We don't have the user's password to generate a cookie. We only have OAuth token.
  
  // Let's try a different V2 endpoint that might accept OAuth?
  // Unlikely. V2 is for their web app.
  
  // But wait! There is a trick in some internal APIs where you can pass token as a cookie `t={token}`.
   // Let's try that.
   
   // Updated based on successful curl:
   // https://api.dida365.com/api/v2/project/all/closed?from=&to=&status=Completed
   // It seems 'from' and 'to' can be empty to get recent ones, or we should pass them correctly.
   // IMPORTANT: The curl worked! 
   // We must ensure all headers are correct.
   
   // NOTE: The 'from' parameter in v2 API seems to require a specific format or can be empty?
   // The curl example had `from=&to=`. 
   // The error `unknown_exception` might be due to date format mismatch.
   // Let's try passing empty 'from' if we want recent, or format it differently.
   // But we want to filter by date.
   // Let's try passing empty 'from' first to see if it works, then filter in memory if needed.
   // Or maybe format as '2025-11-30 00:00:00'? 
   // Let's try matching the curl exactly first: from=&to=
   
   const url = `https://api.dida365.com/api/v2/project/all/closed?from=&to=&status=Completed&limit=100`

   try {
       // Prefer provided cookie, fallback to token trick
       // Note: The curl used a full cookie string. 
       // If user provides just 't=...', we use it. If user provides full string, we use it.
       // If no cookie provided, we fallback to t=token which might fail (500/401).
       const cookieHeader = cookie ? cookie : `t=${token}; wb_index_token=${token}`
       
       console.log('[Dida Debug] Fetching completed tasks from:', url)
       console.log('[Dida Debug] Using Cookie length:', cookieHeader.length)
       console.log('[Dida Debug] Using Cookie start:', cookieHeader.substring(0, 20) + '...')
       
       const response = await fetch(url, {
         headers: {
           'Cookie': cookieHeader,
           'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
           'Accept': 'application/json, text/plain, */*',
           'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
           'hl': 'zh_CN',
           'origin': 'https://dida365.com',
           'referer': 'https://dida365.com/',
           'x-device': '{"platform":"web","os":"macOS 10.15.7","device":"Chrome 120.0.0.0","name":"","version":6430,"id":"680b0399fc7c745c0721270a","channel":"website","campaign":"","websocket":""}',
           'x-tz': 'Asia/Shanghai'
         }
       })

       if (!response.ok) {
           const text = await response.text()
           console.error(`[Dida Debug] Failed response body: ${text.substring(0, 500)}`)
           console.warn(`Failed to fetch all closed tasks with Cookie auth: ${response.status} ${response.statusText}`)
           return []
       }

      const data: any = await response.json()
      
      // Filter by projectId if it's not "all" (though user loop calls this per project, which is inefficient if we can get all at once)
      // But the current architecture calls this function PER project.
      // So we filter the result here.
      if (Array.isArray(data)) {
          // Since we are fetching ALL (from=&to=), we need to manually filter by date if fromDate provided
          let filtered = data
          if (fromDate) {
              const fromTime = new Date(fromDate).getTime()
              filtered = filtered.filter((t: any) => {
                  const completedTime = t.completedTime ? new Date(t.completedTime).getTime() : 0
                  return completedTime >= fromTime
              })
          }

          if (projectId === 'all') {
              return filtered
          }
          return filtered.filter((t: any) => t.projectId === projectId)
      }
      return []

  } catch (e) {
      console.error('Error fetching completed tasks:', e)
      return []
  }
}

const getTimeZoneOffset = (date: Date, timeZone: string) => {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' }).formatToParts(date)
    const tzValue = parts.find((p) => p.type === 'timeZoneName')?.value || ''
    const match = tzValue.match(/GMT([+-]\d{1,2})(?::?(\d{2}))?/)
    if (!match) return '+0800'
    const sign = match[1].startsWith('-') ? '-' : '+'
    const hours = Math.abs(parseInt(match[1], 10))
    const minutes = match[2] ? parseInt(match[2], 10) : 0
    const hourStr = String(hours).padStart(2, '0')
    const minuteStr = String(minutes).padStart(2, '0')
    return `${sign}${hourStr}${minuteStr}`
  } catch {
    return '+0800'
  }
}

const getTimeZoneDateString = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)
  const year = parts.find((p) => p.type === 'year')?.value || '1970'
  const month = parts.find((p) => p.type === 'month')?.value || '01'
  const day = parts.find((p) => p.type === 'day')?.value || '01'
  return `${year}-${month}-${day}`
}

export const createDidaNote = async (token: string, projectId: string, title: string, content: string, timeZone: string = 'Asia/Shanghai') => {
  const now = new Date()
  const dateStr = getTimeZoneDateString(now, timeZone)
  const offset = getTimeZoneOffset(now, timeZone)
  const startDate = `${dateStr}T00:00:00${offset}`
  const dueDate = `${dateStr}T23:59:59${offset}`

  return await $fetch('https://api.dida365.com/open/v1/task', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: {
      title,
      content,
      projectId,
      isAllDay: true,
      startDate, // Note: Dida API format might need checking, but python used ISO with timezone
      dueDate,
      timeZone,
      kind: "NOTE"
    }
  })
}

export const formatTasksForAI = (tasks: any[], projects: any[]) => {
  if (!tasks || tasks.length === 0) {
    return "没有找到任务数据"
  }

  // Map project IDs to names
  const projectMap: Record<string, string> = {}
  projects.forEach((p: any) => {
    projectMap[p.id] = p.name
  })

  // Group tasks by project
  const tasksByProject: Record<string, { pending: any[], completed: any[] }> = {}
  
  // Check if any task has priority > 0
  const hasPriority = tasks.some((t: any) => t.priority > 0)

  tasks.forEach((task: any) => {
    const projectId = task.projectId
    const projectName = projectMap[projectId] || '收集箱'

    if (!tasksByProject[projectName]) {
      tasksByProject[projectName] = { pending: [], completed: [] }
    }

    if (task.status === 0) { // 0: Normal/Pending
      tasksByProject[projectName].pending.push(task)
    } else {
      tasksByProject[projectName].completed.push(task)
    }
  })

  const output: string[] = []
  output.push(`# 滴答清单任务报告`)
  output.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`)

  const totalPending = Object.values(tasksByProject).reduce((acc, val) => acc + val.pending.length, 0)
  const totalCompleted = Object.values(tasksByProject).reduce((acc, val) => acc + val.completed.length, 0)
  
  output.push(`总任务数: ${totalPending + totalCompleted} (未完成: ${totalPending}, 已完成: ${totalCompleted})`)
  output.push("")

  // Sort projects by name
  const projectNames = Object.keys(tasksByProject).sort()

  for (const projectName of projectNames) {
    const projectData = tasksByProject[projectName]
    if (!projectData) continue
    const { pending, completed } = projectData

    if (pending.length === 0 && completed.length === 0) continue

    output.push(`## ${projectName}`)

    if (pending.length > 0) {
      output.push(`### 📋 未完成 (${pending.length}个)`)
      for (const task of pending) {
        const title = task.title || '无标题'
        const priority = task.priority || 0
        const dueDate = task.dueDate || ''
        
        let priorityText = ''
        if (hasPriority) {
             // 优先级映射：高中低无 -> 5, 3, 1, 0
            switch (priority) {
                case 5: priorityText = '(重要紧急)'; break;
                case 3: priorityText = '(重要不紧急)'; break;
                case 1: priorityText = '(不重要紧急)'; break;
                case 0: priorityText = '(不重要不紧急)'; break;
                default: priorityText = '(不重要不紧急)';
            }
        }

        // Simplify due date
        const dueText = dueDate ? ` 📅${dueDate.substring(0, 10)}` : ""
        
        output.push(`- ${title} ${priorityText}${dueText}`)
      }
      output.push("")
    }

    if (completed.length > 0) {
      output.push(`### ✅ 已完成 (${completed.length}个)`)
      for (const task of completed) {
         output.push(`- ✅ ${task.title || '无标题'}`)
      }
      output.push("")
    }
  }

  return output.join('\n')
}
