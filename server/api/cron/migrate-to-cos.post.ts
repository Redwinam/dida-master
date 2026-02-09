/**
 * One-time migration endpoint: Migrate existing daily notes and weekly reports
 * from Supabase DB to Tencent Cloud COS.
 * Protected by CRON_SECRET.
 */
export default defineEventHandler(async event => {
  // Verify cron secret
  const cronSecret = getHeader(event, 'x-cron-secret')
  const config = useRuntimeConfig()

  if (!config.cronSecret || cronSecret !== config.cronSecret) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const adminClient = getAdminClient()
  const results = {
    daily_notes: { total: 0, migrated: 0, errors: 0 },
    weekly_reports: { total: 0, migrated: 0, errors: 0 },
  }

  // 1. Migrate daily notes
  console.log('[MigrateToCOS] Starting daily notes migration...')
  const { data: dailyNotes, error: dnError } = await adminClient
    .from('dida_master_daily_notes')
    .select('*')
    .is('cos_key', null)
    .not('content', 'is', null)
    .neq('content', '')

  if (dnError) {
    console.error('[MigrateToCOS] Failed to fetch daily notes:', dnError)
  }
  else if (dailyNotes && dailyNotes.length > 0) {
    results.daily_notes.total = dailyNotes.length
    for (const note of dailyNotes) {
      try {
        const cosKey = getDailyNoteCOSKey(note.user_id, note.note_date, note.id)
        const cosData = JSON.stringify({
          title: note.title,
          content: note.content,
          created_at: note.created_at,
        })

        await uploadToCOS(cosKey, cosData)

        // Update DB record: set cos_key, clear content
        const { error: updateError } = await adminClient
          .from('dida_master_daily_notes')
          .update({ cos_key: cosKey, content: '' })
          .eq('id', note.id)

        if (updateError) {
          console.error(`[MigrateToCOS] DB update failed for note ${note.id}:`, updateError)
          results.daily_notes.errors++
        }
        else {
          results.daily_notes.migrated++
          console.log(`[MigrateToCOS] Migrated daily note: ${note.id} -> ${cosKey}`)
        }
      }
      catch (e: any) {
        console.error(`[MigrateToCOS] Failed to migrate note ${note.id}:`, e.message)
        results.daily_notes.errors++
      }
    }
  }

  // 2. Migrate weekly reports
  console.log('[MigrateToCOS] Starting weekly reports migration...')
  const { data: weeklyReports, error: wrError } = await adminClient
    .from('dida_master_weekly_reports')
    .select('*')
    .is('cos_key', null)
    .not('content', 'is', null)
    .neq('content', '')

  if (wrError) {
    console.error('[MigrateToCOS] Failed to fetch weekly reports:', wrError)
  }
  else if (weeklyReports && weeklyReports.length > 0) {
    results.weekly_reports.total = weeklyReports.length
    for (const report of weeklyReports) {
      try {
        const cosKey = getWeeklyReportCOSKey(report.user_id, report.period_start, report.period_end, report.id)
        const cosData = JSON.stringify({
          title: report.title,
          content: report.content,
          created_at: report.created_at,
        })

        await uploadToCOS(cosKey, cosData)

        // Update DB record: set cos_key, clear content
        const { error: updateError } = await adminClient
          .from('dida_master_weekly_reports')
          .update({ cos_key: cosKey, content: '' })
          .eq('id', report.id)

        if (updateError) {
          console.error(`[MigrateToCOS] DB update failed for report ${report.id}:`, updateError)
          results.weekly_reports.errors++
        }
        else {
          results.weekly_reports.migrated++
          console.log(`[MigrateToCOS] Migrated weekly report: ${report.id} -> ${cosKey}`)
        }
      }
      catch (e: any) {
        console.error(`[MigrateToCOS] Failed to migrate report ${report.id}:`, e.message)
        results.weekly_reports.errors++
      }
    }
  }

  console.log('[MigrateToCOS] Migration complete:', results)
  return { status: 'ok', results }
})
