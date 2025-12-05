import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'

interface UserConfig {
  user_id: string
  dida_token: string
  dida_project_id: string
  exclude_project_name: string
  llm_api_key: string
  llm_model: string
  llm_api_url: string
  cal_enable: boolean
  icloud_username: string
  icloud_app_password: string
  cal_lookahead_days: number
  calendar_target: string
}

export default defineEventHandler(async (event) => {
  const config = await getUserConfig(event) as unknown as UserConfig

  if (!config.dida_token || !config.dida_project_id) {
    throw createError({ statusCode: 400, message: 'Dida token or projectId missing' })
  }
  if (!config.llm_api_key) {
    throw createError({ statusCode: 400, message: 'LLM API key missing' })
  }


  // 1. Fetch Tasks
  const allProjects = await getDidaProjects(config.dida_token)
  const excludeNames = (config.exclude_project_name || '').split(',').map((s: string) => s.replace(/"/g, '').trim())
  
  let allTasks: any[] = []
  for (const p of (allProjects as any[])) {
      if (!excludeNames.includes(p.name)) {
          const pTasks = await getDidaTasks(config.dida_token, p.id)
          allTasks = allTasks.concat(pTasks)
      }
  }

  // Format tasks for AI
  const tasksContext = formatTasksForAI(allTasks, allProjects as any[])

  // 2. Fetch Calendar
  let calendarContext = '无'
  if (config.cal_enable) {
      const events = await getCalendarEvents({
          icloud_username: config.icloud_username,
          icloud_app_password: config.icloud_app_password
      }, config.cal_lookahead_days)
      
      calendarContext = events.map((e: any) => `- ${e.start} - ${e.title} (${e.location || ''})`).join('\n')
  }

  // 3. Call LLM
  const openai = createLLMClient(config.llm_api_key, config.llm_api_url)
  const plan = await generateDailyPlan(openai, config.llm_model, tasksContext, calendarContext)

  // 4. Create Note
  const title = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  await createDidaNote(config.dida_token, config.dida_project_id, title, plan)

  return { message: 'Success' }
})
