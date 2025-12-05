import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Use explicit client.auth.getUser() for robust session retrieval
  const headers = getRequestHeaders(event)
  // console.log('Config GET: Auth Header present:', !!headers.authorization)
  
  const client = await serverSupabaseClient(event)
  
  // Extract token from header manually to ensure we use the latest token provided by frontend
  // This bypasses potential stale cookie issues in serverSupabaseClient
  let token = undefined
  if (headers.authorization && headers.authorization.startsWith('Bearer ')) {
    token = headers.authorization.substring(7)
  }

  const { data: { user }, error: userError } = await client.auth.getUser(token)

  // console.log('Config GET: User ID:', user?.id)

  if (userError || !user || !user.id) {
    // console.log('Config GET: No user found or error, returning 401. Error:', userError?.message)
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const { data, error } = await client
    .from('dida_master_user_config')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 is "The result contains 0 rows"
    console.error('Supabase config fetch error:', error)
    throw createError({ statusCode: 500, message: error.message })
  }

  return data || {}
})
