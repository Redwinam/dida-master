import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { readMultipartFormData } from 'h3'

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
  const { data } = await client
    .from('dida_master_user_config')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!data) {
    throw createError({ statusCode: 400, message: 'Config not found' })
  }
  
  const config = data as unknown as UserConfig

  const formData = await readMultipartFormData(event)
  const imagePart = formData?.find(p => p.name === 'image')
  
  if (!imagePart) {
    throw createError({ statusCode: 400, message: 'Image required' })
  }

  const imageBase64 = imagePart.data.toString('base64')
  const calendars = (config.calendar_target || '').split(',').map((s: string) => s.trim()).filter(Boolean)

  const openai = createLLMClient(config.llm_api_key, config.llm_api_url)
  
  const todayDate = new Date().toISOString().split('T')[0] || ''
  const events = await parseImageToCalendar(openai, config.llm_model, imageBase64, calendars, todayDate)

  if (!events || events.length === 0) {
      return { events: [] }
  }

  // Add events to calendar
  for (const ev of events) {
      // Use default calendar if not specified or not found in list (LLM might hallucinate)
      const targetCal = ev.calendar || calendars[0]
      await addEventToCalendar({
          icloud_username: config.icloud_username,
          icloud_app_password: config.icloud_app_password
      }, ev, targetCal)
  }

  return { events }
})
