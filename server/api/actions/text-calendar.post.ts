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

export default defineEventHandler(async event => {
  const config = await getUserConfig(event) as unknown as UserConfig

  const body = await readBody(event)
  const text = body?.text

  if (!text) {
    throw createError({ statusCode: 400, message: 'Text required' })
  }

  const calendars = (config.calendar_target || '').split(',').map((s: string) => s.trim()).filter(Boolean)

  const token = getHeader(event, 'Authorization')?.replace('Bearer ', '') || getCookie(event, 'sb-access-token')

  const todayDate = new Date().toISOString().split('T')[0] || ''

  // Use async callback mode to avoid timeout
  const runtimeConfig = useRuntimeConfig()
  if (!runtimeConfig.siteUrl) {
    throw createError({ statusCode: 500, message: 'Server Configuration Error: siteUrl is not configured.' })
  }
  const callbackUrl = `${runtimeConfig.siteUrl}/api/callbacks/text-calendar`

  const callbackPayload = {
    user_id: config.user_id,
    cal_enable: config.cal_enable,
    cal_username: config.cal_username,
    cal_password: config.cal_password,
    cal_server_url: config.cal_server_url,
    calendars,
  }

  console.log('[TextCalendar] Sending async request...')
  await parseTextToCalendar(text, calendars, todayDate, token, config.user_id, callbackUrl, callbackPayload)

  return { status: 'queued', message: '已提交，AI 正在后台解析日程...' }
})
