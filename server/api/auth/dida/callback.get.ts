import { defineEventHandler, getQuery, sendRedirect, createError, setCookie } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const code = query.code as string
  
  if (!code) {
    return createError({
      statusCode: 400,
      statusMessage: 'Authorization code is missing'
    })
  }

  const clientId = config.didaClientId
  const clientSecret = config.didaClientSecret
  const redirectUri = `http://localhost:3000/api/auth/dida/callback`

  if (!clientId || !clientSecret) {
    return createError({
      statusCode: 500,
      statusMessage: 'Dida credentials are not configured'
    })
  }

  try {
    const params = new URLSearchParams()
    params.append('code', code)
    params.append('grant_type', 'authorization_code')
    params.append('scope', 'tasks:write tasks:read')
    params.append('redirect_uri', redirectUri)
    params.append('client_id', clientId as string)
    params.append('client_secret', clientSecret as string)

    const response: any = await $fetch('https://dida365.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    })

    if (response.access_token) {
      // Redirect back to the home page with the token in query
      // This allows the frontend to grab it and populate the form
      return sendRedirect(event, `/?dida_token=${response.access_token}`)
    } else {
      throw new Error('No access token received')
    }
  } catch (error: any) {
    console.error('Dida Auth Error:', error)
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to exchange token: ' + (error.message || error)
    })
  }
})
