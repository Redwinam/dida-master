import { serverSupabaseUser } from '#supabase/server'
import { serverSupabaseClient } from '#supabase/server'
import { H3Event } from 'h3'

export const getUserConfig = async (event: H3Event) => {
  let userId: string | undefined

  // 1. Check for API Key in Header or Query
  const apiKey = getHeader(event, 'x-api-key') || getQuery(event).api_key as string
  
  let client
  
  if (apiKey) {
    // Verify API Key via Admin Client (since we need to search users)
    console.log('[UserConfig] Validating API Key...')
    let supabaseAdmin
    try {
       // @ts-ignore
       supabaseAdmin = getAdminClient()
    } catch (e) {
       console.error('[UserConfig] getAdminClient failed:', e)
       // Fallback to manual creation if auto-import fails (ReferenceError)
       const config = useRuntimeConfig()
       const { createClient } = await import('@supabase/supabase-js')
       supabaseAdmin = createClient(config.public.supabaseUrl as string, config.supabaseServiceKey, {
         auth: { autoRefreshToken: false, persistSession: false }
       })
    }

    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()
    
    if (error) {
        console.error('API Key validation error:', error)
        throw createError({ statusCode: 500, message: 'Internal Auth Error' })
    }

    // Find user with matching API Key
    // Note: listUsers is paginated (default 50), this is a limitation for large scale
    // For production, better to store API keys in a separate table or use a more efficient lookup
    // But following the requested reference implementation:
    const foundUser = users.find((u: any) => u.user_metadata?.api_key === apiKey)
    
    if (foundUser) {
        userId = foundUser.id
    } else {
        throw createError({ statusCode: 401, message: 'Invalid API Key' })
    }
    
    // Set client for later use
    client = supabaseAdmin
  } else {
    // 2. Fallback to Session Authentication
    // Use serverSupabaseClient + getUser for more robust session retrieval
    try {
        client = await serverSupabaseClient(event)
        const { data: { user } } = await client.auth.getUser()
        
        if (user) {
            userId = user.id
        }
    } catch (e) {
        console.error('Session Auth Error:', e)
        throw createError({ statusCode: 401, message: 'Session Auth Failed or Missing' })
    }
  }

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Fetch Config for the identified user
  // Reuse client if we have it
  if (!client) {
      try {
          client = await serverSupabaseClient(event)
      } catch (e) {
           console.warn('Failed to get Supabase client for config fetch, trying admin fallback')
           try {
               // @ts-ignore
               client = getAdminClient()
           } catch (e2) {
                // Manual fallback again
               const config = useRuntimeConfig()
               const { createClient } = await import('@supabase/supabase-js')
               client = createClient(config.public.supabaseUrl as string, config.supabaseServiceKey, {
                    auth: { autoRefreshToken: false, persistSession: false }
               })
           }
      }
  }

  const { data, error } = await client
    .from('dida_master_user_config')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && (error as any).code !== 'PGRST116') {
    throw createError({ statusCode: 500, message: (error as any).message || 'Supabase error' })
  }

  if (!data) {
    const rc = useRuntimeConfig()
    const fallback = {
      user_id: userId,
      dida_token: rc.didaToken || '',
      dida_project_id: rc.didaProjectId || '',
      exclude_project_name: '',
      llm_api_key: rc.openaiApiKey || '',
      llm_model: rc.public.llmModel || 'deepseek-ai/DeepSeek-V3.2-Exp',
      vision_model: 'Qwen/Qwen3-VL-32B-Instruct',
      llm_api_url: rc.public.llmApiUrl || 'https://api.siliconflow.cn/v1/chat/completions',
      vision_api_key: '',
      vision_api_url: '',
      cal_enable: !!(rc.icloudUsername && rc.icloudAppPassword),
      icloud_username: rc.icloudUsername || '',
      icloud_app_password: rc.icloudAppPassword || '',
      cal_lookahead_days: 2,
      calendar_target: '',
      timezone: 'Asia/Shanghai'
    }

    const hasMinimum = fallback.dida_token && fallback.dida_project_id && fallback.llm_api_key
    if (!hasMinimum) {
      throw createError({ statusCode: 400, message: 'Config not found' })
    }
    return fallback
  }

  // Merge settings into the main object for easier consumption
  const { settings, ...rest } = data
  return {
    user_id: rest.user_id,
    updated_at: rest.updated_at,
    ...(settings || {})
  }
}
