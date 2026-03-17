import { addEventToCalendar } from '../../utils/caldav'

export default defineEventHandler(async event => {
  const body = await readBody(event)
  const { result, payload, success, error } = body

  console.log('[ImageCalendarCallback] Received callback:', { success, error, hasResult: !!result })

  if (!success || error) {
    console.error('[ImageCalendarCallback] AI Generation Failed:', error)
    return { status: 'failed', error }
  }

  if (!payload) {
    console.error('[ImageCalendarCallback] Missing payload context')
    return { status: 'failed', error: 'Missing context' }
  }

  try {
    const { cal_enable, cal_username, cal_password, cal_server_url, calendars } = payload

    // Extract text content from LLM response
    const content = typeof result === 'string'
      ? result
      : (result?.choices?.[0]?.message?.content || result?.content || JSON.stringify(result))

    // Parse JSON events from LLM response
    const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim()
    let events: any[] = []
    try {
      events = JSON.parse(jsonStr)
      if (!Array.isArray(events)) {
        events = [events]
      }
    }
    catch (e) {
      console.error('[ImageCalendarCallback] Failed to parse JSON from LLM:', content)
      return { status: 'failed', error: 'Failed to parse calendar events from AI response' }
    }

    console.log(`[ImageCalendarCallback] Parsed ${events.length} events`)

    // Add events to calendar
    if (cal_enable && events.length > 0) {
      for (const ev of events) {
        const targetCal = ev.calendar || calendars?.[0]
        await addEventToCalendar({
          cal_username,
          cal_password,
          cal_server_url,
        }, ev, targetCal)
      }
      console.log(`[ImageCalendarCallback] Added ${events.length} events to calendar`)
    }

    return { status: 'success', events_count: events.length }
  }
  catch (e: any) {
    console.error('[ImageCalendarCallback] Error processing callback:', e)
    return { status: 'error', message: e.message }
  }
})
