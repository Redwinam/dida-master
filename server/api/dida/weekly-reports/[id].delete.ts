import { defineEventHandler, createError } from 'h3'

export default defineEventHandler(async event => {
  const client = getUserClient(event)
  const { data: { user }, error: userError } = await client.auth.getUser()

  if (userError || !user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing id parameter' })
  }

  // Fetch the record first to get cos_key
  const { data, error } = await client
    .from('dida_master_weekly_reports')
    .select('id, cos_key')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    throw createError({ statusCode: 404, message: 'Report not found' })
  }

  // Delete COS file if exists
  if (data.cos_key) {
    try {
      await deleteFromCOS(data.cos_key)
    }
    catch (cosError) {
      console.error('[WeeklyReportDelete] Failed to delete COS file:', cosError)
      // Continue to delete DB record even if COS deletion fails
    }
  }

  // Delete DB record
  const { error: deleteError } = await client
    .from('dida_master_weekly_reports')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (deleteError) {
    throw createError({ statusCode: 500, message: deleteError.message })
  }

  return { success: true }
})
