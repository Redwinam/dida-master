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

  // Fetch the report record
  const { data, error } = await client
    .from('dida_master_weekly_reports')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    throw createError({ statusCode: 404, message: 'Report not found' })
  }

  // If content is stored in COS, fetch it
  if (data.cos_key && (!data.content || data.content === '')) {
    try {
      const cosContent = await getFromCOS(data.cos_key)
      const parsed = JSON.parse(cosContent)
      return {
        ...data,
        content: parsed.content || cosContent,
      }
    }
    catch (cosError) {
      console.error('[WeeklyReportDetail] Failed to fetch from COS:', cosError)
      // Return with CDN URL as fallback
      try {
        const cdnUrl = generateCDNSignedUrl(data.cos_key)
        return {
          ...data,
          content: null,
          cdn_url: cdnUrl,
        }
      }
      catch {
        throw createError({ statusCode: 500, message: 'Failed to retrieve report content' })
      }
    }
  }

  return data
})
