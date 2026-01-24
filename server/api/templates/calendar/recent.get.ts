import { defineEventHandler, getQuery, createError } from 'h3'
import { getCalendarEvents } from '../../../utils/caldav'
import { getUserConfig } from '../../../utils/userConfig'

interface UserConfig {
  user_id: string
  icloud_username: string
  icloud_app_password: string
  timezone?: string
}

export default defineEventHandler(async (event) => {
  const config = await getUserConfig(event) as unknown as UserConfig

  if (!config.icloud_username || !config.icloud_app_password) {
    throw createError({ statusCode: 400, message: 'iCloud credentials missing' })
  }

  const query = getQuery(event)
  const limit = Math.min(parseInt(query.limit as string) || 10, 100)
  const lookbackDays = Math.min(parseInt(query.lookback_days as string) || 30, 365)

  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - lookbackDays)

  const events = await getCalendarEvents({
    icloud_username: config.icloud_username,
    icloud_app_password: config.icloud_app_password
  }, 0, { start, end })

  const sorted = events
    .filter((e: any) => e?.start)
    .sort((a: any, b: any) => new Date(b.start).getTime() - new Date(a.start).getTime())
    .slice(0, limit)

  return { events: sorted }
})
