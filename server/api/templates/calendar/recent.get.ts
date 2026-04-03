import { defineEventHandler, getQuery, createError } from 'h3'
import { getCalendarEvents } from '../../../utils/caldav'
import { getUserConfig } from '../../../utils/userConfig'

interface UserConfig {
  user_id: string
  cal_username: string
  cal_password: string
  cal_server_url: string
  timezone?: string
}

export default defineEventHandler(async event => {
  const config = await getUserConfig(event) as unknown as UserConfig

  if (!config.cal_username || !config.cal_password || !config.cal_server_url) {
    throw createError({ statusCode: 400, message: 'CalDAV credentials missing' })
  }

  const query = getQuery(event)
  const limit = Math.min(parseInt(query.limit as string) || 20, 100)
  const lookbackDays = Math.min(parseInt(query.lookback_days as string) || 30, 365)
  const lookaheadDays = Math.min(parseInt(query.lookahead_days as string) || 30, 365)

  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - lookbackDays)
  const end = new Date(now)
  end.setDate(end.getDate() + lookaheadDays)

  const events = await getCalendarEvents({
    cal_username: config.cal_username,
    cal_password: config.cal_password,
    cal_server_url: config.cal_server_url,
  }, 0, { start, end })

  const nowTs = now.getTime()

  // Deduplicate by title+location+calendar to surface unique event "shapes"
  // Keep the most recent instance for past events, and the soonest for future events
  const upcomingMap = new Map<string, any>()
  const pastMap = new Map<string, any>()

  for (const ev of events) {
    if (!ev?.start) continue
    const evTs = new Date(ev.start).getTime()
    const key = `${ev.title || ''}|${ev.location || ''}|${ev.calendar || ''}`
    const isFuture = evTs >= nowTs

    if (isFuture) {
      const existing = upcomingMap.get(key)
      // Keep the soonest upcoming instance
      if (!existing || evTs < new Date(existing.start).getTime()) {
        upcomingMap.set(key, { ...ev, _temporal: 'upcoming' })
      }
    }
    else {
      const existing = pastMap.get(key)
      // Keep the most recent past instance
      if (!existing || evTs > new Date(existing.start).getTime()) {
        pastMap.set(key, { ...ev, _temporal: 'past' })
      }
    }
  }

  // Sort upcoming by start ASC (soonest first), past by start DESC (most recent first)
  const upcoming = [...upcomingMap.values()]
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, limit)

  const past = [...pastMap.values()]
    .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
    .slice(0, limit)

  return { events: [...upcoming, ...past] }
})
