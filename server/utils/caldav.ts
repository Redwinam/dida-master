export const getCalendarEvents = async (credentials: any, lookaheadDays: number = 0) => {
  const { createDAVClient } = await import('tsdav')
  const ICAL = (await import('ical.js')).default
  const { icloud_username, icloud_app_password } = credentials
  
  if (!icloud_username || !icloud_app_password) return []

  const client = await createDAVClient({
    serverUrl: 'https://caldav.icloud.com/',
    credentials: {
      username: icloud_username,
      password: icloud_app_password,
    },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  })

  try {
    const calendars = await client.fetchCalendars()
    
    const now = new Date()
    const start = new Date(now.setHours(0,0,0,0)).toISOString()
    const end = new Date(now.setDate(now.getDate() + lookaheadDays)).toISOString() // rough approx

    const allEvents: any[] = []

    for (const calendar of calendars) {
        // tsdav fetchCalendarObjects is basic, might need object filtering
        // For simplicity, we might skip complex date range filtering here if tsdav doesn't support it easily without full sync
        // But tsdav has fetchCalendarObjects with filters.
        
        // Using basic sync or fetch
        const objects = await client.fetchCalendarObjects({
            calendar,
            timeRange: { start, end }
        })

        for (const obj of objects) {
            try {
                const jcal = ICAL.parse(obj.data)
                const comp = new ICAL.Component(jcal)
                const vevent = comp.getFirstSubcomponent('vevent')
                if (!vevent) continue

                const summary = vevent.getFirstPropertyValue('summary')
                const dtstart = vevent.getFirstPropertyValue('dtstart')
                const dtend = vevent.getFirstPropertyValue('dtend')
                const location = vevent.getFirstPropertyValue('location')

                let startJs = null
                let endJs = null
                
                if (dtstart && typeof dtstart === 'object' && 'toJSDate' in dtstart) {
                    startJs = (dtstart as any).toJSDate()
                }
                if (dtend && typeof dtend === 'object' && 'toJSDate' in dtend) {
                    endJs = (dtend as any).toJSDate()
                }

                allEvents.push({
                    title: summary,
                    start: startJs,
                    end: endJs,
                    location,
                    calendar: calendar.displayName
                })
            } catch (e) {
                console.error('Error parsing event', e)
            }
        }
    }
    return allEvents
  } catch (e) {
    console.error('CalDAV error', e)
    return []
  }
}

export const addEventToCalendar = async (credentials: any, eventData: any, targetCalendarName: string) => {
    const { createDAVClient } = await import('tsdav')
    const ICAL = (await import('ical.js')).default
    const { icloud_username, icloud_app_password } = credentials
    const client = await createDAVClient({
        serverUrl: 'https://caldav.icloud.com/',
        credentials: {
            username: icloud_username,
            password: icloud_app_password,
        },
        authMethod: 'Basic',
        defaultAccountType: 'caldav',
    })

    const calendars = await client.fetchCalendars()
    const targetCal = calendars.find(c => c.displayName === targetCalendarName) || calendars[0]
    
    if (!targetCal) throw new Error('No calendar found')

    // Create VCALENDAR object using ical.js
    const comp = new ICAL.Component(['vcalendar', [], []])
    const vevent = new ICAL.Component('vevent')
    
    vevent.addPropertyWithValue('summary', eventData.title)
    vevent.addPropertyWithValue('dtstart', ICAL.Time.fromJSDate(new Date(eventData.start)))
    vevent.addPropertyWithValue('dtend', ICAL.Time.fromJSDate(new Date(eventData.end)))
    if (eventData.location) vevent.addPropertyWithValue('location', eventData.location)
    
    comp.addSubcomponent(vevent)

    await client.createCalendarObject({
        calendar: targetCal,
        iCalString: comp.toString(),
        filename: `${Date.now()}.ics`
    })
}
