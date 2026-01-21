import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    // Create Supabase Client with the passed token (User or Service Role)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Also create Admin client for system queries (fetching service keys)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { service_key, input } = await req.json()

    if (!service_key) {
      throw new Error('Missing service_key')
    }

    // 1. Get Service Key Config (System level)
    const { data: serviceConfig, error: skError } = await supabaseAdmin
      .from('ai_service_keys')
      .select('*')
      .eq('service_key', service_key)
      .single()

    if (skError || !serviceConfig) {
      throw new Error(`Invalid service_key: ${service_key}`)
    }

    // 2. Determine LLM Config
    // If user token is passed, check for user mapping
    let llmConfigId = serviceConfig.default_llm_config_id
    let modelName = serviceConfig.default_model

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (user && !userError) {
      // User is authenticated, check for mapping
      let { data: mapping } = await supabaseClient
        .from('ai_model_mappings')
        .select('llm_config_id, model_name')
        .eq('service_key', service_key)
        .eq('user_id', user.id)
        .single()
        
      // If no specific mapping found, try fallback (Global Default)
      if (!mapping) {
         const fallbackKey = input.type === 'image' ? 'DEFAULT_IMAGE' : 'DEFAULT_TEXT'
         console.log(`[AiGateway] No mapping for ${service_key}, trying fallback: ${fallbackKey}`)
         const { data: fallbackMapping } = await supabaseClient
            .from('ai_model_mappings')
            .select('llm_config_id, model_name')
            .eq('service_key', fallbackKey)
            .eq('user_id', user.id)
            .single()
            
         if (fallbackMapping) {
            mapping = fallbackMapping
            console.log(`[AiGateway] Found fallback mapping:`, mapping)
         } else {
            console.log(`[AiGateway] No fallback mapping found for ${fallbackKey}`)
         }
      }

      if (mapping) {
        if (mapping.llm_config_id) llmConfigId = mapping.llm_config_id
        if (mapping.model_name) modelName = mapping.model_name
      }
    }

    // 3. Fetch LLM Config details
    let llmConfig
    
    // Try fetching with User client first (respects RLS)
    const { data: configData, error: configError } = await supabaseClient
        .from('llm_configs')
        .select('*')
        .eq('id', llmConfigId)
        .single()
        
    llmConfig = configData

    if (!llmConfig) {
        // Fallback: If user config failed (maybe it's a system default config user can't see?), 
        // try fetching as Admin ONLY IF it matches the default config ID.
        // This prevents users from accessing arbitrary configs by ID via this endpoint,
        // unless it's the authorized default for the service.
        if (llmConfigId === serviceConfig.default_llm_config_id) {
             const { data: sysConfig } = await supabaseAdmin
                .from('llm_configs')
                .select('*')
                .eq('id', llmConfigId)
                .single()
             llmConfig = sysConfig
        }
    }

    if (!llmConfig) {
        console.error(`[AiGateway] LLM Config not found for ID: ${llmConfigId}`)
        throw new Error('LLM Configuration not found')
    }

    // 4. Construct Prompt
    let messages = []
    if (input.type === 'text') {
        // Append system prompt if exists
        if (serviceConfig.system_prompt) {
            messages.push({ role: 'system', content: serviceConfig.system_prompt })
        }
        messages.push({ role: 'user', content: input.prompt })
    } else if (input.type === 'image') {
        // ... handle image ...
        if (serviceConfig.system_prompt) {
            messages.push({ role: 'system', content: serviceConfig.system_prompt })
        }
        const userContent: any[] = [
            { type: 'text', text: input.prompt || 'Analyze this image' }
        ]
        
        if (input.image_url) {
             userContent.push({ type: 'image_url', image_url: { url: input.image_url } })
        } else if (input.image_base64) {
             userContent.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${input.image_base64}` } })
        }

        messages.push({ role: 'user', content: userContent })
    }

    // 5. Call LLM
    let apiUrl = llmConfig.api_url
    
    // Construct API URL based on config and type
    if (!apiUrl && llmConfig.base_url) {
      apiUrl = llmConfig.base_url
      // For OpenAI compatible, ensure it ends with chat/completions
      if (llmConfig.interface_type === 'openai_compatible') {
         if (!apiUrl.endsWith('/chat/completions')) {
             apiUrl = apiUrl.endsWith('/') ? `${apiUrl}chat/completions` : `${apiUrl}/chat/completions`
         }
      }
    }

    // Default for Gemini if no URL provided
    if (!apiUrl && llmConfig.interface_type === 'gemini') {
        apiUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
    }

    // Default fallback to OpenAI
    if (!apiUrl) {
        apiUrl = 'https://api.openai.com/v1/chat/completions'
    }

    const apiKey = llmConfig.api_key
    const model = modelName || llmConfig.models?.[0] || 'gpt-3.5-turbo'
    
    console.log(`Calling LLM: ${apiUrl} Model: ${model}`)

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages,
            temperature: serviceConfig.temperature || 0.7,
            max_tokens: serviceConfig.max_tokens || 2000
        })
    })

    if (!response.ok) {
        const errText = await response.text()
        console.error('LLM Provider Error:', errText)
        throw new Error(`LLM Provider Error: ${response.statusText}`)
    }

    const data = await response.json()
    
    return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
