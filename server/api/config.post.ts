export default defineEventHandler(async (event) => {
  const client = getUserClient(event)
  const userId = await getCurrentUserId(event)

  const body = await readBody(event)

  // Everything goes into settings
  const dbData = {
      user_id: userId,
      updated_at: new Date(),
      settings: body
  }

  const { data, error } = await client
    .from('dida_master_user_config')
    .upsert(dbData)
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
