import { defineEventHandler, createError } from 'h3'
import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { getCalendarEvents } from '../../utils/caldav'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // We need the credentials. They should be in the config.
  // However, the user might be in the process of configuring them.
  // So we check body first (if testing connection), then DB.
  
  let credentials: any = null
  const query = getQuery(event)
  const username = query.username as string
  const password = query.password as string

  if (username && password) {
    credentials = { icloud_username: username, icloud_app_password: password }
  } else {
    const client = await serverSupabaseClient(event)
    const { data } = await client
      .from('dida_master_user_config')
      .select('icloud_username, icloud_app_password')
      .eq('user_id', user.id)
      .single()
      
    if (data && data.icloud_username && data.icloud_app_password) {
      credentials = data
    }
  }

  if (!credentials) {
    throw createError({ statusCode: 400, message: 'iCloud credentials missing' })
  }

  // Reuse the logic from getCalendarEvents but just to list calendars
  // Since getCalendarEvents logic is a bit mixed (it fetches events), 
  // we should probably expose a `getCalendars` function in utils/caldav.ts
  // But for now, I can import the same libraries and do it here or refactor.
  // Refactoring is cleaner. Let's check if I can modify utils/caldav.ts easily.
  // Wait, I cannot easily modify utils without context. 
  // I'll implement the fetch logic here directly using the same libs since I know they are installed.
  
  try {
    const { createDAVClient } = await import('tsdav')
    
    const client = await createDAVClient({
        serverUrl: 'https://caldav.icloud.com/',
        credentials: {
        username: credentials.icloud_username,
        password: credentials.icloud_app_password,
        },
        authMethod: 'Basic',
        defaultAccountType: 'caldav',
    })

    const calendars = await client.fetchCalendars()
    return calendars.map(c => ({
        name: c.displayName,
        url: c.url
    }))

  } catch (error: any) {
    console.error('Failed to fetch calendars:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch calendars: ' + (error.message || 'Unknown error')
    })
  }
})
