import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { H3Event } from 'h3'

export const getUserConfig = async (event: H3Event) => {
  let userId: string | undefined

  // 1. Check for API Key in Header or Query
  const apiKey = getHeader(event, 'x-api-key') || getQuery(event).api_key as string
  
  if (apiKey) {
    // Verify API Key via Admin Client (since we need to search users)
    const supabaseAdmin = getAdminClient()
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
  } else {
    // 2. Fallback to Session Authentication
    // Use serverSupabaseClient + getUser for more robust session retrieval
    const client = await serverSupabaseClient(event)
    const { data: { user } } = await client.auth.getUser()
    
    if (user) {
        userId = user.id
    }
  }

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Fetch Config for the identified user
  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('dida_master_user_config')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    // If no config found but user exists, return empty config or error?
    // Endpoints expect config, so error is appropriate if config is mandatory.
    throw createError({ statusCode: 400, message: 'Config not found' })
  }

  return data
}
