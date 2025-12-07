import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { getDidaProjects, getDidaCompletedTasks, createDidaNote, formatTasksForAI } from '../../utils/dida'
import { getCalendarEvents } from '../../utils/caldav'
import { createLLMClient, generateWeeklyReport } from '../../utils/llm'
import { getUserConfig } from '../../utils/userConfig'

interface UserConfig {
  user_id: string
  dida_token: string
  dida_project_id: string
  weekly_report_project_id: string
  exclude_project_name: string
  llm_api_key: string
  llm_model: string
  llm_api_url: string
  cal_enable: boolean
  icloud_username: string
  icloud_app_password: string
  timezone?: string
}

export default defineEventHandler(async (event) => {
  try {
    console.log('[WeeklyReport] Starting...')
    const config = await getUserConfig(event) as unknown as UserConfig
    console.log('[WeeklyReport] Config loaded for user:', config.user_id)

    if (!config.dida_token || !config.weekly_report_project_id) {
      throw createError({ statusCode: 400, message: 'Dida token or Weekly Report Project ID missing. Please configure it in System Config.' })
    }
    if (!config.llm_api_key) {
      throw createError({ statusCode: 400, message: 'LLM API key missing' })
    }

    // 1. Fetch Projects
    console.log('[WeeklyReport] Fetching projects...')
    let allProjects: any[] = []
    try {
      allProjects = await getDidaProjects(config.dida_token) as any[]
    } catch (e) {
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
    
    for (const p of (allProjects as any[])) {
        if (!excludeNames.includes(p.name) && p.id !== config.weekly_report_project_id && p.id !== config.dida_project_id) {
            try {
                const tasks = await getDidaCompletedTasks(config.dida_token, p.id, startStr)
                // Ensure tasks have status if not provided (Dida completed API should return completed tasks)
                // Just in case, we can force status=2 if missing, but let's trust API.
                allCompletedTasks = allCompletedTasks.concat(tasks)
            } catch (e) {
                console.error(`Dida Completed Tasks Fetch Error (Project ${p.id}):`, e)
            }
        }
    }
    console.log(`[WeeklyReport] Fetched ${allCompletedTasks.length} completed tasks`)

    const tasksContext = formatTasksForAI(allCompletedTasks, allProjects)

    // 3. Fetch Calendar (Past 7 Days)
    let calendarContext = '无'
    if (config.cal_enable) {
        console.log('[WeeklyReport] Fetching calendar...')
        const end = new Date(now)
        const events = await getCalendarEvents({
            icloud_username: config.icloud_username,
            icloud_app_password: config.icloud_app_password
        }, 0, { start, end })
        
        const timeZone = config.timezone || 'Asia/Shanghai'
        calendarContext = events.map((e: any) => {
          const startStr = e.start ? new Date(e.start).toLocaleString('zh-CN', { timeZone, hour12: false }) : '未知时间'
          return `- ${startStr} - ${e.title} (${e.location || ''})`
        }).join('\n')
        console.log(`[WeeklyReport] Fetched ${events.length} calendar events`)
    }

    // 4. Call LLM
    console.log('[WeeklyReport] Calling LLM...')
    const openai = createLLMClient(config.llm_api_key, config.llm_api_url)
    let report = ''
    try {
      report = await generateWeeklyReport(openai, config.llm_model, tasksContext, calendarContext, config.timezone)
      console.log('[WeeklyReport] Report generated')
    } catch (e) {
        console.error('LLM Generate Report Error:', e)
        throw createError({ statusCode: 500, message: `LLM Error: ${e}` })
    }

    // 5. Create Note
    console.log('[WeeklyReport] Creating note...')
    const title = `周报 ${start.toLocaleDateString('zh-CN')} - ${now.toLocaleDateString('zh-CN')}`
    await createDidaNote(config.dida_token, config.weekly_report_project_id, title, report)
    console.log('[WeeklyReport] Note created')

    return { message: 'Success' }
  } catch (e: any) {
    console.error('[WeeklyReport] Fatal Error:', e)
    return {
      error: true,
      message: e.message,
      stack: e.stack,
      name: e.name
    }
  }
})
