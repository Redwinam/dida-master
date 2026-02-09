import { getDidaProjects, getDidaCompletedTasks, getDidaTasks, createDidaNote, formatTasksForAI } from '../../utils/dida'
import { getCalendarEvents } from '../../utils/caldav'
import { generateWeeklyReport } from '../../utils/llm'
import { getUserConfig } from '../../utils/userConfig'

interface UserConfig {
  user_id: string
  dida_token: string
  dida_project_id: string
  dida_cookie?: string
  weekly_report_project_id: string
  exclude_project_name: string
  cal_enable: boolean
  cal_username: string
  cal_password: string
  cal_server_url: string
  timezone?: string
  mbti?: string
}

export default defineEventHandler(async event => {
  try {
    console.log('[WeeklyReport] Starting...')
    const config = await getUserConfig(event) as unknown as UserConfig
    console.log('[WeeklyReport] Config loaded for user:', config.user_id)

    if (!config.dida_token || !config.weekly_report_project_id) {
      throw createError({ statusCode: 400, message: 'Dida token or Weekly Report Project ID missing. Please configure it in System Config.' })
    }
    // 1. Fetch Projects
    console.log('[WeeklyReport] Fetching projects...')
    let allProjects: any[] = []
    try {
      allProjects = await getDidaProjects(config.dida_token) as any[]
    }
    catch (e) {
      throw createError({ statusCode: 500, message: `Dida Projects Fetch Failed: ${e}` })
    }

    // 2. Fetch Completed Tasks (Last 7 Days)
    const now = new Date()
    const start = new Date(now)
    start.setDate(start.getDate() - 7)
    // start.setHours(0,0,0,0) // Optional: align to start of day?
    const startStr = start.toISOString()

    const excludeNames = (config.exclude_project_name || '').split(',').map((s: string) => s.replace(/"/g, '').trim())

    let allCompletedTasks: any[] = []

    // Optimization: Fetch all closed tasks once instead of per project
    // Use 'all' as projectId to indicate we want all tasks, then filter later or rely on API to return all
    // Since getDidaCompletedTasks now uses /project/all/closed, we can call it once.
    try {
      console.log('[WeeklyReport] Fetching all completed tasks...')
      // Pass a dummy projectId or 'all' - the function implementation now ignores projectId for the API call
      // but uses it for filtering. To avoid filtering inside getDidaCompletedTasks, we should modify it or
      // just pass 'all' and handle filtering here.
      // Actually, let's update getDidaCompletedTasks to accept 'all' or specific ID,
      // but our current implementation of getDidaCompletedTasks fetches ALL and filters by ID.
      // To be efficient, we should change the loop logic.

      // Let's call it ONCE with 'all' (or any ID since it fetches ALL internally now)
      // But wait, getDidaCompletedTasks filters by ID. We need it to NOT filter.

      // Let's use a special flag or just call it with a special ID that indicates "return all"
      // But better: Update the loop to NOT call getDidaCompletedTasks multiple times.

      // Refactored approach:
      // We need a new function or modify existing one to return ALL tasks without filtering.
      // But since I can't easily change signature everywhere without checking usages (only used here?),
      // I'll assume getDidaCompletedTasks is only used here or I can modify it safely.

      // Let's modify getDidaCompletedTasks to OPTIONALLY filter.
      // For now, I will call it with a specific project ID? No.

      // Let's just use the fact that I modified getDidaCompletedTasks to use /project/all/closed.
      // However, I added logic to FILTER by projectId.
      // I should remove that filter logic from getDidaCompletedTasks if I want to do it here more efficiently.
      // OR, I can revert the loop here and just call it once.

      // Let's assume I will modify getDidaCompletedTasks to NOT filter if projectId is 'all'.
      // Pass token and cookie
      const tasks = await getDidaCompletedTasks(config.dida_token, 'all', startStr, config.dida_cookie)

      // Now filter manually
      allCompletedTasks = tasks.filter((t: any) => {
        const p = allProjects.find(proj => proj.id === t.projectId)
        const pName = p ? p.name : ''
        // Exclude projects
        if (excludeNames.includes(pName)) return false
        if (t.projectId === config.weekly_report_project_id) return false
        if (t.projectId === config.dida_project_id) return false
        return true
      })
    }
    catch (e) {
      console.error('Dida All Completed Tasks Fetch Error:', e)
    }

    console.log(`[WeeklyReport] Fetched ${allCompletedTasks.length} completed tasks`)

    // 2.5 Fetch Uncompleted Tasks (Current Status)
    // Fetch from all projects excluding targets
    console.log('[WeeklyReport] Fetching uncompleted tasks...')
    let allUncompletedTasks: any[] = []
    for (const p of (allProjects as any[])) {
      if (!excludeNames.includes(p.name) && p.id !== config.weekly_report_project_id && p.id !== config.dida_project_id) {
        try {
          const tasks = await getDidaTasks(config.dida_token, p.id)
          allUncompletedTasks = allUncompletedTasks.concat(tasks)
        }
        catch (e) {
          console.error(`Dida Uncompleted Tasks Fetch Error (Project ${p.id}):`, e)
        }
      }
    }
    console.log(`[WeeklyReport] Fetched ${allUncompletedTasks.length} uncompleted tasks`)

    const completedContext = formatTasksForAI(allCompletedTasks, allProjects)
    const uncompletedContext = formatTasksForAI(allUncompletedTasks, allProjects)

    // 3. Fetch Calendar (Past 7 Days + Next 7 Days)
    let calendarContext = '无'
    let nextWeekCalendarContext = '无'

    if (config.cal_enable) {
      console.log('[WeeklyReport] Fetching calendar...')
      // Past 7 days
      const end = new Date(now)
      const events = await getCalendarEvents({
        cal_username: config.cal_username,
        cal_password: config.cal_password,
        cal_server_url: config.cal_server_url,
      }, 0, { start, end })

      // Next 7 days
      const nextStart = new Date(now)
      const nextEnd = new Date(now)
      nextEnd.setDate(nextEnd.getDate() + 7)
      const nextEvents = await getCalendarEvents({
        cal_username: config.cal_username,
        cal_password: config.cal_password,
        cal_server_url: config.cal_server_url,
      }, 0, { start: nextStart, end: nextEnd })

      const timeZone = config.timezone || 'Asia/Shanghai'
      calendarContext = events.map((e: any) => {
        const startStr = e.start ? new Date(e.start).toLocaleString('zh-CN', { timeZone, hour12: false }) : '未知时间'
        return `- ${startStr} - ${e.title} (${e.location || ''})`
      }).join('\n')

      nextWeekCalendarContext = nextEvents.map((e: any) => {
        const startStr = e.start ? new Date(e.start).toLocaleString('zh-CN', { timeZone, hour12: false }) : '未知时间'
        return `- ${startStr} - ${e.title} (${e.location || ''})`
      }).join('\n')

      console.log(`[WeeklyReport] Fetched ${events.length} past events and ${nextEvents.length} future events`)
    }

    // 4. Call LLM (Async)
    console.log('[WeeklyReport] Calling LLM (Async)...')
    const displayStartStr = start.toLocaleDateString('zh-CN', { timeZone: config.timezone || 'Asia/Shanghai' })
    const displayEndStr = now.toLocaleDateString('zh-CN', { timeZone: config.timezone || 'Asia/Shanghai' })
    const dateStr = `${displayStartStr} - ${displayEndStr}`

    try {
      const token = getHeader(event, 'Authorization')?.replace('Bearer ', '') || getCookie(event, 'sb-access-token')

      const runtimeConfig = useRuntimeConfig()
      if (!runtimeConfig.siteUrl) {
        throw createError({ statusCode: 500, message: 'Server Configuration Error: siteUrl is not configured.' })
      }
      const siteUrl = runtimeConfig.siteUrl
      const callbackUrl = `${siteUrl}/api/callbacks/weekly-report`

      const callbackPayload = {
        dida_token: config.dida_token,
        dida_project_id: config.weekly_report_project_id,
        timezone: config.timezone || 'Asia/Shanghai',
        date_str: dateStr,
      }

      const response = await generateWeeklyReport(
        completedContext,
        uncompletedContext,
        calendarContext,
        nextWeekCalendarContext,
        config.timezone,
        token,
        config.mbti,
        config.user_id,
        callbackUrl,
        callbackPayload,
      )
      console.log('[WeeklyReport] Async request sent:', response)
      return { status: 'queued', message: 'Weekly report generation started in background.' }
    }
    catch (e) {
      console.error('LLM Generate Report Error:', e)
      throw createError({ statusCode: 500, message: `LLM Error: ${e}` })
    }

    /*
    // Legacy Synchronous Code
    // 5. Create Note
    console.log('[WeeklyReport] Creating note...')
    // ...

    const timeZone = config.timezone || 'Asia/Shanghai'
    const title = `周报 ${start.toLocaleDateString('zh-CN', { timeZone })} - ${now.toLocaleDateString('zh-CN', { timeZone })}`
    const didaNote: any = await createDidaNote(config.dida_token, config.weekly_report_project_id, title, report, timeZone)
    console.log('[WeeklyReport] Note created')

    const periodStart = start.toLocaleDateString('en-CA', { timeZone })
    const periodEnd = now.toLocaleDateString('en-CA', { timeZone })
    const didaTaskId = didaNote?.id || didaNote?.taskId || didaNote?.data?.id || null
    const adminClient = getAdminClient()
    const { error: insertError } = await adminClient
      .from('dida_master_weekly_reports')
      .insert({
        user_id: config.user_id,
        title,
        content: report,
        dida_task_id: didaTaskId,
        dida_project_id: config.weekly_report_project_id,
        period_start: periodStart,
        period_end: periodEnd
      })

    if (insertError) {
      throw createError({ statusCode: 500, message: insertError.message })
    }

    return { message: 'Success' }
    */
  }
  catch (e: any) {
    console.error('[WeeklyReport] Fatal Error:', e)
    return {
      error: true,
      message: e.message,
      stack: e.stack,
      name: e.name,
    }
  }
})
