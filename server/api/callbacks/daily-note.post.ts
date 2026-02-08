import { createDidaNote } from '../../utils/dida'

export default defineEventHandler(async event => {
  const body = await readBody(event)
  const { result, payload, success, error } = body

  console.log('[DailyNoteCallback] Received callback:', { success, error, hasResult: !!result })

  if (!success || error) {
    console.error('[DailyNoteCallback] AI Generation Failed:', error)
    // Optionally: Update a status in DB if we were tracking it
    return { status: 'failed', error }
  }

  if (!payload || !payload.dida_token || !payload.dida_project_id) {
    console.error('[DailyNoteCallback] Missing payload context')
    return { status: 'failed', error: 'Missing context' }
  }

  try {
    const { dida_token, dida_project_id, timezone } = payload
    const timeZone = timezone || 'Asia/Shanghai'
    const title = new Date().toLocaleDateString('zh-CN', { timeZone, year: 'numeric', month: 'long', day: 'numeric' })

    console.log('[DailyNoteCallback] Creating Dida Note...')
    const didaNote = await createDidaNote(dida_token, dida_project_id, title, result, timeZone)
    console.log('[DailyNoteCallback] Note created:', didaNote?.id)

    return { status: 'success', noteId: didaNote?.id }
  }
  catch (e) {
    console.error('[DailyNoteCallback] Error processing callback:', e)
    return { status: 'error', message: e.message }
  }
})
