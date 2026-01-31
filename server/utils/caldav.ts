export const getCalendarEvents = async (credentials: any, lookaheadDays: number = 0, customRange?: { start: Date, end: Date }) => {
  try {
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
  
    const calendars = await client.fetchCalendars()
    
    let startStr: string
    let endStr: string

    if (customRange) {
        startStr = customRange.start.toISOString()
        endStr = customRange.end.toISOString()
    } else {
        const now = new Date()
        const s = new Date(now)
        s.setHours(0,0,0,0)
        startStr = s.toISOString()
        
        const e = new Date(s) // Start from 00:00
        e.setDate(e.getDate() + lookaheadDays)
        endStr = e.toISOString()
    }

    const allEvents: any[] = []

    for (const calendar of calendars) {
        let retries = 3
        while (retries > 0) {
            try {
                const objects = await client.fetchCalendarObjects({
                    calendar,
                    timeRange: { start: startStr, end: endStr }
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
                break // Success, exit retry loop
            } catch (err: any) {
                console.error(`Error fetching calendar ${calendar.displayName}:`, err.message)
                if (err.message && (err.message.includes('socket disconnected') || err.message.includes('network'))) {
                    retries--
                    if (retries > 0) {
                        console.log(`Retrying... (${retries} left)`)
                        await new Promise(r => setTimeout(r, 1000)) // Wait 1s
                        continue
                    }
                }
                break // Non-retriable or out of retries
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
    
    console.log(`[CalDAV] Adding event to calendar: ${targetCal?.displayName} (Requested: ${targetCalendarName})`)

    if (!targetCal) throw new Error('No calendar found')

    // Create VCALENDAR object using ical.js
    const { randomUUID } = await import('node:crypto')
    const comp = new ICAL.Component(['vcalendar', [], []])
    comp.updatePropertyWithValue('prodid', '-//Trae AI//NONSGML Dida Task//EN')
    comp.updatePropertyWithValue('version', '2.0')

    const vevent = new ICAL.Component('vevent')
    vevent.addPropertyWithValue('uid', randomUUID())
    vevent.addPropertyWithValue('dtstamp', ICAL.Time.fromJSDate(new Date(), true))
    
    vevent.addPropertyWithValue('summary', eventData.title)
    vevent.addPropertyWithValue('dtstart', ICAL.Time.fromJSDate(new Date(eventData.start), true))
    vevent.addPropertyWithValue('dtend', ICAL.Time.fromJSDate(new Date(eventData.end), true))
    if (eventData.location) vevent.addPropertyWithValue('location', eventData.location)
    if (eventData.description) vevent.addPropertyWithValue('description', eventData.description)
    if (Array.isArray(eventData.reminders)) {
        for (const reminder of eventData.reminders) {
            const minutes = typeof reminder === 'number' ? reminder : parseInt(reminder, 10)
            if (!minutes || Number.isNaN(minutes)) continue
            const alarm = new ICAL.Component('valarm')
            alarm.addPropertyWithValue('action', 'DISPLAY')
            alarm.addPropertyWithValue('description', eventData.title || 'Reminder')
            alarm.addPropertyWithValue('trigger', `-PT${minutes}M`)
            vevent.addSubcomponent(alarm)
        }
    }
    
    comp.addSubcomponent(vevent)

    await client.createCalendarObject({
        calendar: targetCal,
        iCalString: comp.toString(),
        filename: `${Date.now()}.ics`
    })
}
