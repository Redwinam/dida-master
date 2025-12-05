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
