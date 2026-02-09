import { defineEventHandler, getQuery, createError } from 'h3'

export default defineEventHandler(async event => {
  const client = getUserClient(event)
  const { data: { user }, error: userError } = await client.auth.getUser()

  if (userError || !user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const query = getQuery(event)
  const page = parseInt(query.page as string) || 1
  const pageSize = parseInt(query.pageSize as string) || 10
  const offset = (page - 1) * pageSize

  // Fetch metadata only (exclude content to reduce payload)
  const { data, error, count } = await client
    .from('dida_master_daily_notes')
    .select('id, user_id, title, dida_task_id, dida_project_id, note_date, cos_key, created_at, updated_at', { count: 'exact' })
    .eq('user_id', user.id)
    .order('note_date', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return {
    data,
    total: count || 0,
    page,
    pageSize,
  }
})
