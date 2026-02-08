import { defineEventHandler, createError, getQuery } from 'h3'

export default defineEventHandler(async event => {
  const client = getUserClient(event)
  const { data: { user }, error: userError } = await client.auth.getUser()

  if (!user || userError) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  let credentials: any = null
  const query = getQuery(event)
  const username = query.username as string
  const password = query.password as string
  const serverUrl = query.server_url as string

  if (username && password && serverUrl) {
    credentials = { cal_username: username, cal_password: password, cal_server_url: serverUrl }
  }
  else {
    const { data: rawData } = await client
      .from('dida_master_user_config')
      .select('settings')
      .eq('user_id', user.id)
      .single()

    const settings = rawData?.settings as any
    if (settings && settings.cal_username && settings.cal_password && settings.cal_server_url) {
      credentials = settings
    }
  }

  if (!credentials) {
    throw createError({ statusCode: 400, message: 'CalDAV credentials missing' })
  }

  try {
    const { createDAVClient } = await import('tsdav')

    const client = await createDAVClient({
      serverUrl: credentials.cal_server_url,
      credentials: {
        username: credentials.cal_username,
        password: credentials.cal_password,
      },
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
    })

    let calendars: any[] = []
    let lastError
    for (let i = 0; i < 3; i++) {
      try {
        calendars = await client.fetchCalendars()
        lastError = null
        break
      }
      catch (e: any) {
        console.warn(`Attempt ${i + 1} failed to fetch calendars: ${e.message}`)
        lastError = e
        // Wait 1s before retry
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    if (lastError) throw lastError

    return calendars.map(c => ({
      name: c.displayName,
      url: c.url,
    }))
  }
  catch (error: any) {
    console.error('Failed to fetch calendars:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch calendars: ' + (error.message || 'Unknown error'),
    })
  }
})
