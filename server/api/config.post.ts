import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized: No user or user ID' })
  }

  const body = await readBody(event)
  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('dida_master_user_config')
    .upsert({
      user_id: user.id,
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
