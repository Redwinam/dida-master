import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'

interface UserConfig {
  user_id: string
  dida_token: string
  dida_project_id: string
  weekly_report_project_id?: string
  exclude_project_name: string
  llm_api_key: string
  llm_model: string
  llm_api_url: string
  cal_enable: boolean
  icloud_username: string
  icloud_app_password: string
  cal_lookahead_days: number
  calendar_target: string
  timezone?: string
}

export default defineEventHandler(async (event) => {
  try {
    console.log('[DailyNote] Starting...')
    const config = await getUserConfig(event) as unknown as UserConfig
    console.log('[DailyNote] Config loaded for user:', config.user_id)

    if (!config.dida_token || !config.dida_project_id) {
      throw createError({ statusCode: 400, message: 'Dida token or projectId missing' })
    }
    if (!config.llm_api_key) {
      throw createError({ statusCode: 400, message: 'LLM API key missing' })
    }


    // 1. Fetch Tasks
    console.log('[DailyNote] Fetching tasks...')
    let allProjects: any[] = []
    try {
      allProjects = await getDidaProjects(config.dida_token) as any[]
      console.log(`[DailyNote] Fetched ${allProjects.length} projects`)
    } catch (e) {
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
            } catch (e) {
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
            icloud_username: config.icloud_username,
            icloud_app_password: config.icloud_app_password
        }, config.cal_lookahead_days)
        
        const timeZone = config.timezone || 'Asia/Shanghai'
        calendarContext = events.map((e: any) => {
          const startStr = e.start ? new Date(e.start).toLocaleString('zh-CN', { timeZone, hour12: false }) : '未知时间'
          return `- ${startStr} - ${e.title} (${e.location || ''})`
        }).join('\n')
        console.log(`[DailyNote] Fetched ${events.length} calendar events`)
    }

    // 3. Call LLM
    console.log('[DailyNote] Calling LLM...')
    const openai = createLLMClient(config.llm_api_key, config.llm_api_url)
    let plan = ''
    try {
      plan = await generateDailyPlan(openai, config.llm_model, tasksContext, calendarContext, config.timezone)
      console.log('[DailyNote] Plan generated')
    } catch (e) {
        console.error('LLM Generate Plan Error:', e)
        throw createError({ statusCode: 500, message: `LLM Error: ${e}` })
    }

    // 4. Create Note
    console.log('[DailyNote] Creating note...')
    const title = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
    await createDidaNote(config.dida_token, config.dida_project_id, title, plan)
    console.log('[DailyNote] Note created')

    return { message: 'Success' }
  } catch (e: any) {
    console.error('[DailyNote] Fatal Error:', e)
    return {
      error: true,
      message: e.message,
      stack: e.stack,
      name: e.name,
      details: 'Check server logs for more info'
    }
  }
})
