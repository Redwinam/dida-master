import { defineEventHandler, readBody, createError } from 'h3'

export default defineEventHandler(async event => {
  const client = getUserClient(event)
  const { data: { user }, error: authError } = await client.auth.getUser()

  if (authError || !user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const baseEvent = body?.base_event || body?.baseEvent
  const rules = body?.rules || {}

  if (!name) {
    throw createError({ statusCode: 400, message: 'name required' })
  }

  if (!baseEvent || typeof baseEvent !== 'object') {
    throw createError({ statusCode: 400, message: 'base_event required' })
  }

  const normalizedRules = {
    ...rules,
    fixed_fields: Array.isArray(rules?.fixed_fields) ? rules.fixed_fields : (rules?.fixed_fields ? [rules.fixed_fields] : []),
    title_rule: typeof rules?.title_rule === 'string' ? rules.title_rule.trim() : '',
  }

  const fixedFields = normalizedRules.fixed_fields || []
  const sanitizedBaseEvent = fixedFields.reduce((acc: Record<string, any>, field: string) => {
    if (baseEvent[field] !== undefined && baseEvent[field] !== null && baseEvent[field] !== '') {
      acc[field] = baseEvent[field]
    }
    return acc
  }, {})

  const payload = {
    user_id: user.id,
    name,
    base_event: sanitizedBaseEvent,
    rules: normalizedRules,
    updated_at: new Date(),
  }

  const { data, error } = await client
    .from('dida_master_calendar_templates')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
