import { addEventToCalendar } from '../../utils/caldav'
import { parseTextToCalendar } from '../../utils/llm'
import { getUserConfig } from '../../utils/userConfig'

interface UserConfig {
  user_id: string
  dida_token: string
  dida_project_id: string
  exclude_project_name: string
  cal_enable: boolean
  cal_username: string
  cal_password: string
  cal_server_url: string
  cal_lookahead_days: number
  calendar_target: string
  timezone?: string
}

export default defineEventHandler(async (event) => {
  const config = await getUserConfig(event) as unknown as UserConfig

  const body = await readBody(event)
  const text = body?.text
  
  if (!text) {
    throw createError({ statusCode: 400, message: 'Text required' })
  }

  const calendars = (config.calendar_target || '').split(',').map((s: string) => s.trim()).filter(Boolean)

  const token = getHeader(event, 'Authorization')?.replace('Bearer ', '') || getCookie(event, 'sb-access-token')

  const todayDate = new Date().toISOString().split('T')[0] || ''
  const events = await parseTextToCalendar(text, calendars, todayDate, token)

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
              cal_username: config.cal_username,
              cal_password: config.cal_password,
              cal_server_url: config.cal_server_url
          }, ev, targetCal)
      }
  }

  return { events }
})
