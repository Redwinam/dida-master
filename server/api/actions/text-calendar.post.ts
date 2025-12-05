import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'

interface UserConfig {
  user_id: string
  dida_token: string
  dida_project_id: string
  exclude_project_name: string
  llm_api_key: string
  llm_model: string
  vision_model?: string
  llm_api_url: string
  cal_enable: boolean
  icloud_username: string
  icloud_app_password: string
  cal_lookahead_days: number
  calendar_target: string
}

export default defineEventHandler(async (event) => {
  const config = await getUserConfig(event) as unknown as UserConfig

  const body = await readBody(event)
  const text = body?.text
  
  if (!text) {
    throw createError({ statusCode: 400, message: 'Text required' })
  }

  const calendars = (config.calendar_target || '').split(',').map((s: string) => s.trim()).filter(Boolean)

  // 3. Call LLM
  const openai = createLLMClient(config.llm_api_key, config.llm_api_url)
  
  const todayDate = new Date().toISOString().split('T')[0] || ''
  
  // Use configured LLM model for text
  const model = config.llm_model || 'deepseek-ai/DeepSeek-V3'

  const events = await parseTextToCalendar(openai, model, text, calendars, todayDate)

  if (!events || events.length === 0) {
      return { events: [] }
  }

  // Add events to calendar
  // Check if calendar sync is enabled before trying to add events
  if (config.cal_enable) {
      for (const ev of events) {
          // Use default calendar if not specified or not found in list (LLM might hallucinate)
          const targetCal = ev.calendar || calendars[0]
          await addEventToCalendar({
              icloud_username: config.icloud_username,
              icloud_app_password: config.icloud_app_password
          }, ev, targetCal)
      }
  }

  return { events }
})
