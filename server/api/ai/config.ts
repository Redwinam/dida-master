import { defineEventHandler, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  const client = getUserClient(event)
  const { data: { user }, error: authError } = await client.auth.getUser()

  if (authError || !user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const method = event.method

  if (method === 'GET') {
    // 1. Fetch available service keys for this app
    // Assuming 'DIDA' is the app_key.
    const { data: serviceKeys, error: skError } = await client
      .from('ai_service_keys')
      .select('*')
      .eq('app_key', 'DIDA')
      .order('service_order')

    if (skError) {
        console.error('Error fetching service keys', skError)
    }

    // 2. Fetch user's LLM configs
    const { data: llmConfigs, error: lcError } = await client
      .from('llm_configs')
      .select('id, name, models')
      .eq('user_id', user.id)

    if (lcError) {
        console.error('Error fetching llm configs', lcError)
    }

    // 3. Fetch current mappings
    const { data: mappings, error: mError } = await client
      .from('ai_model_mappings')
      .select('*')
      .eq('user_id', user.id)

    if (mError) {
        console.error('Error fetching mappings', mError)
    }

    return {
      serviceKeys: serviceKeys || [],
      llmConfigs: llmConfigs || [],
      mappings: mappings || []
    }
  }

  if (method === 'POST') {
    const body = await readBody(event)
    const { mappings } = body

    if (!Array.isArray(mappings)) {
      throw createError({ statusCode: 400, message: 'Invalid mappings' })
    }

    // Upsert mappings
    const updates = mappings.map((m: any) => ({
      user_id: user.id,
      service_key: m.service_key,
      llm_config_id: m.llm_config_id,
      model_name: m.model_name
    }))

    const { error } = await client
      .from('ai_model_mappings')
      .upsert(updates, { onConflict: 'user_id, service_key' })

    if (error) {
      throw createError({ statusCode: 500, message: error.message })
    }

    return { success: true }
  }
})
