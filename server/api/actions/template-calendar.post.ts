import { defineEventHandler, readBody, createError, getHeader, getCookie } from 'h3'
import { addEventToCalendar } from '../../utils/caldav'
import { getUserConfig } from '../../utils/userConfig'
import { parseTextToTemplateFields } from '../../utils/llm'

interface UserConfig {
  user_id: string
  cal_enable: boolean
  cal_username: string
  cal_password: string
  cal_server_url: string
  calendar_target: string
  timezone?: string
}

const getAdminSupabase = async () => {
  try {
    return getAdminClient()
  }
  catch (e) {
    const config = useRuntimeConfig()
    const { createClient } = await import('@supabase/supabase-js')
    return createClient(config.public.supabaseUrl as string, config.supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
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

export default defineEventHandler(async event => {
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
  const titleRule = template.rules?.title_rule || ''
  const baseEvent = template.base_event || {}

  console.log('[TemplateCalendar] Input', {
    templateId,
    text,
    timeZone,
    todayDate,
    calendars,
    fixedFields,
    titleRule,
    baseEvent,
  })

  const rawParsed = await parseTextToTemplateFields(text, calendars, todayDate, timeZone, template, token)
  console.log('[TemplateCalendar] Parsed', rawParsed)
  const parsed = Array.isArray(rawParsed) ? rawParsed[0] : rawParsed
  const merged = mergeEventFields(parsed, baseEvent, fixedFields)

  if (!merged.description && parsed?.notes) {
    merged.description = parsed.notes
  }

  if (titleRule && !merged.title) {
    merged.title = ''
  }

  console.log('[TemplateCalendar] Merged', merged)

  if (calendars.length > 0 && (!merged.calendar || !calendars.includes(merged.calendar))) {
    merged.calendar = template.base_event?.calendar || calendars[0]
  }

  if (!merged.start || !merged.end) {
    throw createError({ statusCode: 400, message: 'start/end required' })
  }

  if (config.cal_enable) {
    const targetCal = merged.calendar || calendars[0]
    await addEventToCalendar({
      cal_username: config.cal_username,
      cal_password: config.cal_password,
      cal_server_url: config.cal_server_url,
    }, merged, targetCal)
  }

  await admin
    .from('dida_master_calendar_templates')
    .update({ last_used_at: new Date(), updated_at: new Date() })
    .eq('id', template.id)
    .eq('user_id', config.user_id)

  return { event: merged }
})
