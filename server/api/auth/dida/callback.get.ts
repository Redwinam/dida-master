import { defineEventHandler, getQuery, sendRedirect, createError, setCookie } from 'h3'
import { Buffer } from 'node:buffer'

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
    console.error('Missing Dida Credentials', { clientId: !!clientId, clientSecret: !!clientSecret })
    return createError({
      statusCode: 500,
      statusMessage: 'Dida credentials are not configured'
    })
  }

  try {
    const authString = `${clientId}:${clientSecret}`
    const authBase64 = Buffer.from(authString).toString('base64')

    const params = new URLSearchParams()
    params.append('code', code)
    params.append('grant_type', 'authorization_code')
    params.append('scope', 'tasks:write tasks:read')
    params.append('redirect_uri', redirectUri)

    console.log('Exchanging token with code:', code)
    
    const response: any = await $fetch('https://dida365.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authBase64}`
      },
      body: params
    })

    if (response.access_token) {
      setCookie(event, 'dida_access_token', response.access_token, {
        httpOnly: false, 
        maxAge: 60 * 60 * 24 * 30 // 30 days
      })
      
      return sendRedirect(event, `/auth/dida/success?token=${response.access_token}`)
    } else {
      console.error('No access token in response:', response)
      throw new Error('No access token received')
    }
  } catch (error: any) {
    console.error('Dida Auth Error Full:', error)
    // Try to read error body if available
    if (error.data) {
        console.error('Dida Error Data:', error.data)
    }
    return createError({
      statusCode: 500,
      statusMessage: 'Failed to exchange token: ' + (error.message || error)
    })
  }
})
