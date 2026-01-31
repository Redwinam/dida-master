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

export default defineEventHandler(async (event) => {
  const config = await getUserConfig(event) as unknown as UserConfig

  if (!config.cal_username || !config.cal_password || !config.cal_server_url) {
    throw createError({ statusCode: 400, message: 'CalDAV credentials missing' })
  }

  const query = getQuery(event)
  const limit = Math.min(parseInt(query.limit as string) || 10, 100)
  const lookbackDays = Math.min(parseInt(query.lookback_days as string) || 30, 365)

  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - lookbackDays)

  const events = await getCalendarEvents({
    cal_username: config.cal_username,
    cal_password: config.cal_password,
    cal_server_url: config.cal_server_url
  }, 0, { start, end })

  const sorted = events
    .filter((e: any) => e?.start)
    .sort((a: any, b: any) => new Date(b.start).getTime() - new Date(a.start).getTime())
    .slice(0, limit)

  return { events: sorted }
})
