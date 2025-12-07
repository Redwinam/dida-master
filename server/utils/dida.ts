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

export const getDidaCompletedTasks = async (token: string, projectId: string, fromDate: string) => {
  const data: any = await $fetch(`https://api.dida365.com/open/v1/project/${projectId}/completed`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    query: {
        from: fromDate,
        limit: 100 // Reasonable limit
    },
    timeout: 10000
  })
  return data || []
}

export const createDidaNote = async (token: string, projectId: string, title: string, content: string) => {
  const now = new Date()
  const startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString().replace(/\.\d{3}Z$/, '+0800') // Simplification for Asia/Shanghai
  const dueDate = new Date(now.setHours(23, 59, 59, 999)).toISOString().replace(/\.\d{3}Z$/, '+0800')

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
      timeZone: "Asia/Shanghai",
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
