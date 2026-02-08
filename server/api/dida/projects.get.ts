import { defineEventHandler, getQuery, createError } from 'h3'
import { getDidaProjects } from '../../utils/dida'

export default defineEventHandler(async event => {
  // We expect the token to be passed in the Authorization header or query
  // Since this is a proxy, we can let the client pass the token
  // But to be secure/standard, we should probably use the session's stored token if available,
  // OR let the client pass it if they are just configuring.

  // Since the frontend might not have saved the token yet (during configuration),
  // we should allow passing token via header `X-Dida-Token` or query param `token`.
  // Or we can rely on the `dida_master_user_config` if the user is logged in.

  // Let's support both:
  // 1. If `token` query param is provided, use it (good for testing/initial setup)
  // 2. If not, try to fetch from DB for current user.

  const query = getQuery(event)
  let token = query.token as string

  if (!token) {
    // Try to get from DB
    try {
      const client = getUserClient(event)
      const { data: { user }, error } = await client.auth.getUser()
      if (user && !error) {
        const { data } = await client
          .from('dida_master_user_config')
          .select('dida_token')
          .eq('user_id', user.id)
          .single()

        const config = data as any
        if (config?.dida_token) {
          token = config.dida_token
        }
      }
    }
    catch {
      // Silently ignore - will fall through to token check below
    }
  }

  if (!token) {
    throw createError({
      statusCode: 401,
      message: 'Dida Token is missing. Please connect Dida365 first.',
    })
  }

  try {
    const projects = await getDidaProjects(token)
    return projects
  }
  catch (error: any) {
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch projects: ' + error.message,
    })
  }
})
