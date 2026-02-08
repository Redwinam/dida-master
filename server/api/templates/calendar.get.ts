import { defineEventHandler, getQuery, createError } from 'h3'

export default defineEventHandler(async event => {
  const client = getUserClient(event)
  const { data: { user }, error: authError } = await client.auth.getUser()

  if (authError || !user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const query = getQuery(event)
  const limit = Math.min(parseInt(query.limit as string) || 20, 100)
  const offset = parseInt(query.offset as string) || 0

  const { data, error, count } = await client
    .from('dida_master_calendar_templates')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return {
    data: data || [],
    total: count || 0,
    limit,
    offset,
  }
})
