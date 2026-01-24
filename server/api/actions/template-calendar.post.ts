import { defineEventHandler, readBody, createError, getHeader, getCookie } from 'h3'
import { addEventToCalendar } from '../../utils/caldav'
import { getUserConfig } from '../../utils/userConfig'
import { parseTextToTemplateFields } from '../../utils/llm'

interface UserConfig {
  user_id: string
  cal_enable: boolean
  icloud_username: string
  icloud_app_password: string
  calendar_target: string
  timezone?: string
}

const getAdminSupabase = async () => {
  try {
    return getAdminClient()
  } catch (e) {
    const config = useRuntimeConfig()
    const { createClient } = await import('@supabase/supabase-js')
    return createClient(config.public.supabaseUrl as string, config.supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  }
}

const mergeEventFields = (parsed: any, baseEvent: any, fixedFields: string[]) => {
  const merged: Record<string, any> = {}
  for (const [key, value] of Object.entries(parsed || {})) {
    if (value !== undefined && value !== null && value !== '') {
      merged[key] = value
    }
  }
  for (const field of fixedFields) {
    if (baseEvent && baseEvent[field] !== undefined && baseEvent[field] !== null && baseEvent[field] !== '') {
      merged[field] = baseEvent[field]
    }
  }
  return merged
}

export default defineEventHandler(async (event) => {
  const config = await getUserConfig(event) as unknown as UserConfig
  const body = await readBody(event)
  const text = body?.text
  const templateId = body?.template_id || body?.templateId

  if (!text) {
    throw createError({ statusCode: 400, message: 'text required' })
  }
  if (!templateId) {
    throw createError({ statusCode: 400, message: 'template_id required' })
  }

  const admin = await getAdminSupabase()
  const { data: template, error: tplError } = await admin
    .from('dida_master_calendar_templates')
    .select('*')
    .eq('user_id', config.user_id)
    .eq('id', templateId)
    .single()

  if (tplError || !template) {
    throw createError({ statusCode: 404, message: 'template not found' })
  }

  const calendars = (config.calendar_target || '').split(',').map((s: string) => s.trim()).filter(Boolean)
  const token = getHeader(event, 'Authorization')?.replace('Bearer ', '') || getCookie(event, 'sb-access-token')
  const timeZone = config.timezone || 'Asia/Shanghai'
  const todayDate = new Date().toLocaleDateString('en-CA', { timeZone }) || ''

  const fixedFields = Array.isArray(template.rules?.fixed_fields) ? template.rules.fixed_fields : []
  const parsed = await parseTextToTemplateFields(text, calendars, todayDate, timeZone, template, token)
  let merged = mergeEventFields(parsed, template.base_event || {}, fixedFields)

  if (!merged.description && parsed?.notes) {
    merged.description = parsed.notes
  }
  if (!merged.title) {
    const fallbackTitle = text
      .split('\n')
      .map((line: string) => line.trim())
      .find((line: string) => line.length > 0)
    if (fallbackTitle && !/\d/.test(fallbackTitle)) {
      merged.title = fallbackTitle
    }
  }

  const titleRule = template.rules?.title_rule
  if (titleRule && !merged.title) {
    merged.title = ''
  }

  if (calendars.length > 0 && (!merged.calendar || !calendars.includes(merged.calendar))) {
    merged.calendar = template.base_event?.calendar || calendars[0]
  }

  if (!merged.start || !merged.end) {
    throw createError({ statusCode: 400, message: 'start/end required' })
  }

  if (config.cal_enable) {
    const targetCal = merged.calendar || calendars[0]
    await addEventToCalendar({
      icloud_username: config.icloud_username,
      icloud_app_password: config.icloud_app_password
    }, merged, targetCal)
  }

  await admin
    .from('dida_master_calendar_templates')
    .update({ last_used_at: new Date(), updated_at: new Date() })
    .eq('id', template.id)
    .eq('user_id', config.user_id)

  return { event: merged }
})
