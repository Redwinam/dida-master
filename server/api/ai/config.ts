import { defineEventHandler, readBody, createError } from 'h3'

const FIXED_SERVICE_KEYS = [
  {
    service_key: 'DIDA_DAILY_NOTE',
    label: 'DIDA_DAILY_NOTE',
    description: '日报生成',
    is_active: true,
    service_order: 1,
  },
  {
    service_key: 'DIDA_IMAGE_TO_CALENDAR',
    label: 'DIDA_IMAGE_TO_CALENDAR',
    description: '图片转日程',
    is_active: true,
    service_order: 2,
  },
  {
    service_key: 'DIDA_TEXT_TO_CALENDAR',
    label: 'DIDA_TEXT_TO_CALENDAR',
    description: '文本转日程',
    is_active: true,
    service_order: 3,
  },
  {
    service_key: 'DIDA_WEEKLY_REPORT',
    label: 'DIDA_WEEKLY_REPORT',
    description: '周报生成',
    is_active: true,
    service_order: 4,
  },
] as const

const ALLOWED_SERVICE_KEYS = new Set<string>(FIXED_SERVICE_KEYS.map(item => item.service_key))

export default defineEventHandler(async event => {
  const client = getUserClient(event)
  const { data: { user }, error: authError } = await client.auth.getUser()

  if (authError || !user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const method = event.method

  if (method === 'GET') {
    // 1. 固定场景（硬编码，不依赖 cool_ai_service_keys 表）
    const serviceKeys = [...FIXED_SERVICE_KEYS]

    // 2. Fetch user's LLM configs
    const { data: llmConfigs, error: lcError } = await client
      .from('cool_llm_configs')
      .select('id, name, models')
      .eq('user_id', user.id)

    if (lcError) {
      console.error('Error fetching llm configs', lcError)
    }

    // 3. Fetch current mappings
    const { data: mappings, error: mError } = await client
      .from('cool_ai_model_mappings')
      .select('*')
      .eq('user_id', user.id)
      .in('service_key', [...ALLOWED_SERVICE_KEYS])

    if (mError) {
      console.error('Error fetching mappings', mError)
    }

    return {
      serviceKeys: serviceKeys || [],
      llmConfigs: llmConfigs || [],
      mappings: mappings || [],
    }
  }

  if (method === 'POST') {
    const body = await readBody(event)
    const { mappings } = body

    if (!Array.isArray(mappings)) {
      throw createError({ statusCode: 400, message: 'Invalid mappings' })
    }

    const normalizedMappings = mappings.map((m: any) => ({
      ...m,
      service_key: String(m?.service_key || '').trim().toUpperCase(),
    }))

    const invalidKeys = normalizedMappings
      .map((m: any) => m.service_key)
      .filter((key: string) => !ALLOWED_SERVICE_KEYS.has(key))

    if (invalidKeys.length > 0) {
      throw createError({
        statusCode: 400,
        message: `Unsupported service_key: ${Array.from(new Set(invalidKeys)).join(', ')}`,
      })
    }

    // Upsert mappings
    const updates = normalizedMappings.map((m: any) => ({
      user_id: user.id,
      service_key: m.service_key,
      llm_config_id: m.llm_config_id || null,
      model_name: m.model_name || null,
    }))

    const { error } = updates.length
      ? await client
          .from('cool_ai_model_mappings')
          .upsert(updates, { onConflict: 'user_id, service_key' })
      : { error: null }

    if (error) {
      throw createError({ statusCode: 500, message: error.message })
    }

    return { success: true }
  }
})
