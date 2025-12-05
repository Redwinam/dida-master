import { defineEventHandler, sendRedirect, getRequestURL } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const clientId = config.didaClientId
  
  if (!clientId) {
    return createError({
      statusCode: 500,
      statusMessage: 'Dida Client ID is not configured'
    })
  }

  const reqURL = getRequestURL(event)
  const siteUrl = config.siteUrl || `${reqURL.protocol}//${reqURL.host}`
  const redirectUri = `${siteUrl}/api/auth/dida/callback`
  const state = Math.random().toString(36).substring(7)
  const scope = 'tasks:write tasks:read'
  
  const params = new URLSearchParams({
    client_id: clientId as string,
    scope,
    state,
    redirect_uri: redirectUri,
    response_type: 'code'
  })

  const url = `https://dida365.com/oauth/authorize?${params.toString()}`
  
  return sendRedirect(event, url)
})
