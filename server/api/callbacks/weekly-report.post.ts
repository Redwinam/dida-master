import { createDidaNote } from '../../utils/dida'

export default defineEventHandler(async event => {
  const body = await readBody(event)
  const { result, payload, success, error } = body

  console.log('[WeeklyReportCallback] Received callback:', { success, error, hasResult: !!result })

  if (!success || error) {
    console.error('[WeeklyReportCallback] AI Generation Failed:', error)
    return { status: 'failed', error }
  }

  if (!payload || !payload.dida_token || !payload.dida_project_id) {
    console.error('[WeeklyReportCallback] Missing payload context')
    return { status: 'failed', error: 'Missing context' }
  }

  try {
    const { user_id, dida_token, dida_project_id, timezone, date_str } = payload
    const timeZone = timezone || 'Asia/Shanghai'
    const title = `周报 ${date_str}`

    // Extract text content from LLM response
    const content = typeof result === 'string'
      ? result
      : (result?.choices?.[0]?.message?.content || result?.content || JSON.stringify(result))

    // Calculate period dates
    const now = new Date()
    const start = new Date(now)
    start.setDate(start.getDate() - 7)
    const periodStart = start.toLocaleDateString('en-CA', { timeZone })
    const periodEnd = now.toLocaleDateString('en-CA', { timeZone })

    // Pre-generate record ID for unique COS key
    const recordId = crypto.randomUUID()

    // 1. Upload content to COS
    let cosKey: string | null = null
    if (user_id) {
      cosKey = getWeeklyReportCOSKey(user_id, periodStart, periodEnd, recordId)
      const cosData = JSON.stringify({ title, content, created_at: new Date().toISOString() })
      await uploadToCOS(cosKey, cosData)
      console.log('[WeeklyReportCallback] Uploaded to COS:', cosKey)
    }

    // 2. Save metadata to Supabase DB
    if (user_id) {
      try {
        const adminClient = getAdminClient()
        const { error: insertError } = await adminClient
          .from('dida_master_weekly_reports')
          .insert({
            id: recordId,
            user_id,
            title,
            dida_project_id,
            period_start: periodStart,
            period_end: periodEnd,
            cos_key: cosKey,
          })

        if (insertError) {
          console.error('[WeeklyReportCallback] DB insert failed:', insertError)
        }
        else {
          console.log('[WeeklyReportCallback] Saved metadata to DB')
        }
      }
      catch (dbError) {
        console.error('[WeeklyReportCallback] DB save error:', dbError)
      }
    }

    // 3. Create Dida Note
    console.log('[WeeklyReportCallback] Creating Dida Note...')
    const didaNote = await createDidaNote(dida_token, dida_project_id, title, content, timeZone) as Record<string, any> | null
    console.log('[WeeklyReportCallback] Note created:', didaNote?.id)

    return { status: 'success', noteId: didaNote?.id }
  }
  catch (e: any) {
    console.error('[WeeklyReportCallback] Error processing callback:', e)
    return { status: 'error', message: e.message }
  }
})
