/**
 * Cron Dispatcher - Called by pg_cron every minute
 * Checks which users have scheduled tasks that should run now,
 * then triggers the corresponding action endpoints.
 */
export default defineEventHandler(async event => {
  // Verify cron secret
  const cronSecret = getHeader(event, 'x-cron-secret')
  const config = useRuntimeConfig()

  if (!config.cronSecret || cronSecret !== config.cronSecret) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const siteUrl = config.siteUrl as string
  if (!siteUrl) {
    throw createError({ statusCode: 500, message: 'siteUrl not configured' })
  }

  try {
    const adminClient = getAdminClient()

    // Get all user configs with schedule settings
    const { data: allConfigs, error: configError } = await adminClient
      .from('dida_master_user_config')
      .select('user_id, settings')

    if (configError) {
      console.error('[CronDispatcher] Failed to fetch configs:', configError)
      return { status: 'error', message: configError.message }
    }

    if (!allConfigs || allConfigs.length === 0) {
      return { status: 'ok', triggered: 0 }
    }

    // Get all users with API keys (needed for authentication)
    const { data: { users }, error: usersError } = await adminClient.auth.admin.listUsers()
    if (usersError) {
      console.error('[CronDispatcher] Failed to list users:', usersError)
      return { status: 'error', message: 'Failed to list users' }
    }

    // Build a map of userId -> apiKey
    const apiKeyMap = new Map<string, string>()
    for (const user of users) {
      if (user.user_metadata?.api_key) {
        apiKeyMap.set(user.id, user.user_metadata.api_key)
      }
    }

    const now = new Date()
    let triggeredCount = 0
    const errors: string[] = []

    for (const userConfig of allConfigs) {
      const settings = (userConfig.settings || {}) as Record<string, any>
      const apiKey = apiKeyMap.get(userConfig.user_id)

      if (!apiKey) continue // Skip users without API key

      const timezone = settings.timezone || 'Asia/Shanghai'

      // Get current time in user's timezone
      const userNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
      const currentHour = userNow.getHours().toString().padStart(2, '0')
      const currentMinute = userNow.getMinutes().toString().padStart(2, '0')
      const currentTime = `${currentHour}:${currentMinute}`
      const currentDay = userNow.getDay() // 0=Sunday, 1=Monday, ...

      // Check daily note schedule
      if (settings.schedule_daily_enabled && settings.schedule_daily_time) {
        // Match with 5-minute window (since we check every minute, but tasks may be configured at 5-min intervals)
        if (isTimeMatch(currentTime, settings.schedule_daily_time)) {
          try {
            console.log(`[CronDispatcher] Triggering daily-note for user ${userConfig.user_id} at ${currentTime}`)
            await $fetch(`${siteUrl}/api/actions/daily-note`, {
              method: 'POST',
              headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json',
              },
              timeout: 30000,
            })
            triggeredCount++
          }
          catch (e: any) {
            const errMsg = `daily-note for ${userConfig.user_id}: ${e.message}`
            console.error(`[CronDispatcher] Error: ${errMsg}`)
            errors.push(errMsg)
          }
        }
      }

      // Check weekly report schedule
      if (settings.schedule_weekly_enabled && settings.schedule_weekly_time) {
        const scheduledDay = settings.schedule_weekly_day ?? 1
        if (currentDay === scheduledDay && isTimeMatch(currentTime, settings.schedule_weekly_time)) {
          try {
            console.log(`[CronDispatcher] Triggering weekly-report for user ${userConfig.user_id} at ${currentTime}`)
            await $fetch(`${siteUrl}/api/actions/weekly-report`, {
              method: 'POST',
              headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json',
              },
              timeout: 30000,
            })
            triggeredCount++
          }
          catch (e: any) {
            const errMsg = `weekly-report for ${userConfig.user_id}: ${e.message}`
            console.error(`[CronDispatcher] Error: ${errMsg}`)
            errors.push(errMsg)
          }
        }
      }
    }

    console.log(`[CronDispatcher] Done. Triggered: ${triggeredCount}, Errors: ${errors.length}`)
    return {
      status: 'ok',
      triggered: triggeredCount,
      errors: errors.length > 0 ? errors : undefined,
    }
  }
  catch (e: any) {
    console.error('[CronDispatcher] Fatal error:', e)
    return { status: 'error', message: e.message }
  }
})

/**
 * Check if current time matches the scheduled time.
 * Exact minute match.
 */
function isTimeMatch(currentTime: string, scheduledTime: string): boolean {
  return currentTime === scheduledTime
}
