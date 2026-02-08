import { defineEventHandler, createError } from 'h3'

export default defineEventHandler(async event => {
  const client = getUserClient(event)
  const { data: { user }, error: authError } = await client.auth.getUser()

  if (authError || !user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, message: 'template id required' })
  }

  const { data, error } = await client
    .from('dida_master_calendar_templates')
    .select('*')
    .eq('user_id', user.id)
    .eq('id', id)
    .single()

  if (error) {
    throw createError({ statusCode: 404, message: error.message })
  }

  return data
})
