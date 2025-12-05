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
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const client = await serverSupabaseClient(event)
  // Get config
  const { data } = await client
    .from('dida_master_user_config')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!data) {
    throw createError({ statusCode: 400, message: 'Config not found' })
  }
  
  const config = data as unknown as UserConfig

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
  const tasksContext = allTasks.map(t => `- ${t.title} (Status: ${t.status === 0 ? 'Pending' : 'Done'})`).join('\n')

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
