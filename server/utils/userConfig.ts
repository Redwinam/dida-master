import { H3Event } from 'h3'
import type { Database } from '../../types/database.types'

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
    try {
        client = getUserClient(event)
        const { data: { user }, error } = await client.auth.getUser()
        
        if (user && !error) {
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
          client = getUserClient(event)
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

  const { data: rawData, error } = await client
    .from('dida_master_user_config')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && (error as any).code !== 'PGRST116') {
    throw createError({ statusCode: 500, message: (error as any).message || 'Supabase error' })
  }

  const data = rawData as Database['public']['Tables']['dida_master_user_config']['Row'] | null

  if (!data) {
    const rc = useRuntimeConfig()
    
    // Resolve credentials from generic env vars
    const calUsername = (rc.calUsername || '') as string
    const calPassword = (rc.calPassword || '') as string
    const calServerUrl = (rc.calServerUrl || '') as string
    const calEnable = !!(calUsername && calPassword && calServerUrl)

    const fallback = {
      user_id: userId,
      dida_token: rc.didaToken || '',
      dida_project_id: rc.didaProjectId || '',
      dida_cookie: '',
      weekly_report_project_id: '',
      exclude_project_name: '',
      vision_model: 'Qwen/Qwen3-VL-32B-Instruct',
      vision_api_key: '',
      vision_api_url: '',
      cal_enable: calEnable,
      cal_username: calUsername,
      cal_password: calPassword,
      cal_server_url: calServerUrl,
      cal_lookahead_days: 2,
      calendar_target: '',
      timezone: 'Asia/Shanghai'
    }

    const hasMinimum = fallback.dida_token && fallback.dida_project_id
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
    ...(settings as Record<string, any> || {})
  }
}
