import { defineEventHandler, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const client = getUserClient(event)
  const { data: { user }, error: authError } = await client.auth.getUser()

  if (authError || !user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, message: 'template id required' })
  }

  const body = await readBody(event)
  const name = typeof body?.name === 'string' ? body.name.trim() : undefined
  const baseEvent = body?.base_event || body?.baseEvent
  const rules = body?.rules

  const { data: existing, error: fetchError } = await client
    .from('dida_master_calendar_templates')
    .select('*')
    .eq('user_id', user.id)
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    throw createError({ statusCode: 404, message: 'template not found' })
  }

  const resolvedRules = rules || existing.rules || {}
  const normalizedRules = {
    ...resolvedRules,
    fixed_fields: Array.isArray(resolvedRules?.fixed_fields) ? resolvedRules.fixed_fields : (resolvedRules?.fixed_fields ? [resolvedRules.fixed_fields] : []),
    title_rule: typeof resolvedRules?.title_rule === 'string' ? resolvedRules.title_rule.trim() : ''
  }

  const resolvedBaseEvent = baseEvent && typeof baseEvent === 'object' ? baseEvent : (existing.base_event || {})
  const fixedFields = normalizedRules.fixed_fields || []
  const sanitizedBaseEvent = fixedFields.reduce((acc: Record<string, any>, field: string) => {
    if (resolvedBaseEvent[field] !== undefined && resolvedBaseEvent[field] !== null && resolvedBaseEvent[field] !== '') {
      acc[field] = resolvedBaseEvent[field]
    }
    return acc
  }, {})

  const payload = {
    name: name || existing.name,
    base_event: sanitizedBaseEvent,
    rules: normalizedRules,
    updated_at: new Date()
  }

  const { data, error } = await client
    .from('dida_master_calendar_templates')
    .update(payload)
    .eq('user_id', user.id)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
