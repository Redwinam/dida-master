import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  
  // console.log('Config GET - User:', user ? { id: user.id, email: user.email } : 'null')

  if (!user || !user.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized: No user or user ID' })
  }

  const client = await serverSupabaseClient(event)

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
