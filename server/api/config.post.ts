import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  // Explicitly get user from auth api
  const { data: { user }, error: userError } = await client.auth.getUser()
  
  if (userError || !user || !user.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  
  const userId = user.id

  const body = await readBody(event)

  const { data, error } = await client
    .from('dida_master_user_config')
    .upsert({
      user_id: userId,
      ...body,
      updated_at: new Date()
    })
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
