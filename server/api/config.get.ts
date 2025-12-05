import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const user = await serverSupabaseUser(event)
  let userId = user?.id as string | undefined
  if (!userId) {
    const { data } = await client.auth.getUser()
    userId = data?.user?.id
  }
  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const { data, error } = await client
    .from('dida_master_user_config')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 is "The result contains 0 rows"
    console.error('Supabase config fetch error:', error)
    throw createError({ statusCode: 500, message: error.message })
  }

  return data || {}
})
