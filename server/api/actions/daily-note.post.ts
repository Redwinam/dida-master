import { getDidaProjects, getDidaTasks, createDidaNote, formatTasksForAI } from '../../utils/dida'
import { getCalendarEvents } from '../../utils/caldav'
import { generateDailyPlan } from '../../utils/llm'
import { getUserConfig } from '../../utils/userConfig'

interface UserConfig {
  user_id: string
  dida_token: string
  dida_project_id: string
  weekly_report_project_id?: string
  exclude_project_name: string
  cal_enable: boolean
  cal_username: string
  cal_password: string
  cal_server_url: string
  cal_lookahead_days: number
  calendar_target: string
  timezone?: string
  mbti?: string
}

export default defineEventHandler(async event => {
  try {
    console.log('[DailyNote] Starting...')
    const config = await getUserConfig(event) as unknown as UserConfig
    console.log('[DailyNote] Config loaded for user:', config.user_id)

    if (!config.dida_token || !config.dida_project_id) {
      throw createError({ statusCode: 400, message: 'Dida token or projectId missing' })
    }
    // 1. Fetch Tasks
    console.log('[DailyNote] Fetching tasks...')
    let allProjects: any[] = []
    try {
      allProjects = await getDidaProjects(config.dida_token) as any[]
      console.log(`[DailyNote] Fetched ${allProjects.length} projects`)
    }
    catch (e) {
      console.error('Dida Projects Fetch Error:', e)
      throw createError({ statusCode: 500, message: `Dida Projects Fetch Failed: ${e}` })
    }

    const excludeNames = (config.exclude_project_name || '').split(',').map((s: string) => s.replace(/"/g, '').trim())

    let allTasks: any[] = []
    for (const p of (allProjects as any[])) {
      // Exclude projects in exclusion list AND the target project itself AND the weekly report project
      if (!excludeNames.includes(p.name) && p.id !== config.dida_project_id && p.id !== config.weekly_report_project_id) {
        try {
          // console.log(`[DailyNote] Fetching tasks for project: ${p.name}`)
          const pTasks = await getDidaTasks(config.dida_token, p.id)
          allTasks = allTasks.concat(pTasks)
        }
        catch (e) {
          console.error(`Dida Tasks Fetch Error (Project ${p.id}):`, e)
          // Continue with other projects if one fails? Or fail?
          // Let's fail to be safe or just log
        }
      }
    }
    console.log(`[DailyNote] Fetched ${allTasks.length} tasks`)

    // Format tasks for AI
    const tasksContext = formatTasksForAI(allTasks, allProjects as any[])

    // 2. Fetch Calendar
    let calendarContext = '无'
    if (config.cal_enable) {
      console.log('[DailyNote] Fetching calendar...')
      const events = await getCalendarEvents({
        cal_username: config.cal_username,
        cal_password: config.cal_password,
        cal_server_url: config.cal_server_url,
      }, config.cal_lookahead_days)

      const timeZone = config.timezone || 'Asia/Shanghai'
      calendarContext = events.map((e: any) => {
        const startStr = e.start ? new Date(e.start).toLocaleString('zh-CN', { timeZone, hour12: false }) : '未知时间'
        return `- ${startStr} - ${e.title} (${e.location || ''})`
      }).join('\n')
      console.log(`[DailyNote] Fetched ${events.length} calendar events`)
    }

    // 3. Call LLM (Async with Callback)
    console.log('[DailyNote] Calling LLM (Async)...')
    try {
      const token = getHeader(event, 'Authorization')?.replace('Bearer ', '') || getCookie(event, 'sb-access-token')

      // Determine callback URL
      const runtimeConfig = useRuntimeConfig()
      if (!runtimeConfig.siteUrl) {
        throw createError({ statusCode: 500, message: 'Server Configuration Error: siteUrl is not configured.' })
      }
      const siteUrl = runtimeConfig.siteUrl
      const callbackUrl = `${siteUrl}/api/callbacks/daily-note`

      // Payload for callback to resume execution (save note)
      const callbackPayload = {
        dida_token: config.dida_token,
        dida_project_id: config.dida_project_id,
        timezone: config.timezone || 'Asia/Shanghai',
      }

      const response = await generateDailyPlan(
        tasksContext,
        calendarContext,
        config.timezone,
        token,
        config.mbti,
        undefined, // userId
        callbackUrl,
        callbackPayload,
      )

      console.log('[DailyNote] Async request sent:', response)
      return { status: 'queued', message: 'Daily note generation started in background.' }
    }
    catch (e) {
      console.error('LLM Generate Plan Error:', e)
      throw createError({ statusCode: 500, message: `LLM Error: ${e}` })
    }

    /*
    // Legacy Synchronous Code (Commented out)
    // 4. Create Note
    console.log('[DailyNote] Creating note...')
    const timeZone = config.timezone || 'Asia/Shanghai'
    const title = new Date().toLocaleDateString('zh-CN', { timeZone, year: 'numeric', month: 'long', day: 'numeric' })
    const didaNote: any = await createDidaNote(config.dida_token, config.dida_project_id, title, plan, timeZone)
    console.log('[DailyNote] Note created')

    // ... DB Saving ...

    const noteDate = new Date().toLocaleDateString('en-CA', { timeZone })
    const didaTaskId = didaNote?.id || didaNote?.taskId || didaNote?.data?.id || null

    // 5. Save to Supabase DB (History)
    const client = await serverSupabaseServiceRole(event)
    const { error: insertError } = await client
      .from('daily_notes')
      .insert({
        user_id: config.user_id,
        date: noteDate,
        content: plan,
        dida_task_id: didaTaskId,
        title: title
      })

    if (insertError) {
      console.error('DB Insert Error:', insertError)
    }

    return { status: 'success', noteId: didaTaskId }
    */
  }
  catch (e: any) {
    console.error('[DailyNote] Fatal Error:', e)
    return {
      error: true,
      message: e.message,
      stack: e.stack,
      name: e.name,
      details: 'Check server logs for more info',
    }
  }
})
