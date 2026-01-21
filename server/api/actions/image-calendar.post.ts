import { addEventToCalendar } from '../../utils/caldav'
import { parseImageToCalendar } from '../../utils/llm'
import { getUserConfig } from '../../utils/userConfig'
import { readMultipartFormData } from 'h3'

interface UserConfig {
  user_id: string
  dida_token: string
  dida_project_id: string
  exclude_project_name: string
  llm_api_key: string
  llm_model: string
  vision_model?: string
  llm_api_url: string
  vision_api_key?: string
  vision_api_url?: string
  cal_enable: boolean
  icloud_username: string
  icloud_app_password: string
  cal_lookahead_days: number
  calendar_target: string
  timezone?: string
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

  const todayDate = new Date().toISOString().split('T')[0] || ''
  // Ensure imageBase64 doesn't have prefix
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')
  
  const token = getHeader(event, 'Authorization')?.replace('Bearer ', '') || getCookie(event, 'sb-access-token')

  const events = await parseImageToCalendar(cleanBase64, calendars, todayDate, token)

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
