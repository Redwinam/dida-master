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
  const config = await getUserConfig(event) as unknown as UserConfig

  const formData = await readMultipartFormData(event)
  const imagePart = formData?.find(p => p.name === 'image')
  
  if (!imagePart) {
    throw createError({ statusCode: 400, message: 'Image required' })
  }

  const imageBase64 = imagePart.data.toString('base64')
  const calendars = (config.calendar_target || '').split(',').map((s: string) => s.trim()).filter(Boolean)

  // 3. Call LLM
  const openai = createLLMClient(config.llm_api_key, config.llm_api_url)
  
  const todayDate = new Date().toISOString().split('T')[0] || ''
  // Ensure imageBase64 doesn't have prefix
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')
  
  // Use a capable Vision model. If the user's configured model is a text-only model (like deepseek-v3),
  // we should fallback to a known vision model or let the user configure a separate vision model.
  // For now, let's hardcode a fallback if the configured model is likely text-only, 
  // OR better yet, use a specific vision model constant if available.
  // Given the context, we should probably default to Qwen/Qwen2.5-VL-72B-Instruct if the user hasn't specified a vision model explicitly.
  // But currently we only have one `llm_model` config. 
  
  // Let's force use Qwen/Qwen2.5-VL-72B-Instruct for image tasks if the current model is deepseek (which is text only usually)
  let visionModel = config.llm_model
  if (visionModel.includes('deepseek') || !visionModel) {
      visionModel = 'Qwen/Qwen2.5-VL-72B-Instruct'
  }

  const events = await parseImageToCalendar(openai, visionModel, cleanBase64, calendars, todayDate)

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
