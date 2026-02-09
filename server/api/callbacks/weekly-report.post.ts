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
    const { dida_token, dida_project_id, timezone, date_str } = payload
    const timeZone = timezone || 'Asia/Shanghai'
    const title = `周报 ${date_str}`

    // Extract text content from LLM response (may be full OpenAI response object or plain string)
    const content = typeof result === 'string'
      ? result
      : (result?.choices?.[0]?.message?.content || result?.content || JSON.stringify(result))

    console.log('[WeeklyReportCallback] Creating Dida Note...')
    const didaNote = await createDidaNote(dida_token, dida_project_id, title, content, timeZone)
    console.log('[WeeklyReportCallback] Note created:', didaNote?.id)

    return { status: 'success', noteId: didaNote?.id }
  }
  catch (e) {
    console.error('[WeeklyReportCallback] Error processing callback:', e)
    return { status: 'error', message: e.message }
  }
})
