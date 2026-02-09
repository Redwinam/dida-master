import { createDidaNote } from '../../utils/dida'

export default defineEventHandler(async event => {
  const body = await readBody(event)
  const { result, payload, success, error } = body

  console.log('[DailyNoteCallback] Received callback:', { success, error, hasResult: !!result })

  if (!success || error) {
    console.error('[DailyNoteCallback] AI Generation Failed:', error)
    return { status: 'failed', error }
  }

  if (!payload || !payload.dida_token || !payload.dida_project_id) {
    console.error('[DailyNoteCallback] Missing payload context')
    return { status: 'failed', error: 'Missing context' }
  }

  try {
    const { user_id, dida_token, dida_project_id, timezone } = payload
    const timeZone = timezone || 'Asia/Shanghai'
    const title = new Date().toLocaleDateString('zh-CN', { timeZone, year: 'numeric', month: 'long', day: 'numeric' })
    const noteDate = new Date().toLocaleDateString('en-CA', { timeZone })

    // Extract text content from LLM response
    const content = typeof result === 'string'
      ? result
      : (result?.choices?.[0]?.message?.content || result?.content || JSON.stringify(result))

    // Pre-generate record ID for unique COS key
    const recordId = crypto.randomUUID()

    // 1. Upload content to COS
    let cosKey: string | null = null
    if (user_id) {
      try {
        cosKey = getDailyNoteCOSKey(user_id, noteDate, recordId)
        const cosData = JSON.stringify({ title, content, created_at: new Date().toISOString() })
        await uploadToCOS(cosKey, cosData)
        console.log('[DailyNoteCallback] Uploaded to COS:', cosKey)
      }
      catch (cosError) {
        console.error('[DailyNoteCallback] COS upload failed, saving content to DB instead:', cosError)
        cosKey = null
      }
    }

    // 2. Save metadata to Supabase DB
    if (user_id) {
      try {
        const adminClient = getAdminClient()
        const insertData: Record<string, any> = {
          id: recordId,
          user_id,
          title,
          dida_project_id,
          note_date: noteDate,
        }
        if (cosKey) {
          insertData.cos_key = cosKey
          insertData.content = '' // Content stored in COS
        }
        else {
          insertData.content = content // Fallback: store in DB
        }

        const { error: insertError } = await adminClient
          .from('dida_master_daily_notes')
          .insert(insertData)

        if (insertError) {
          console.error('[DailyNoteCallback] DB insert failed:', insertError)
        }
        else {
          console.log('[DailyNoteCallback] Saved metadata to DB')
        }
      }
      catch (dbError) {
        console.error('[DailyNoteCallback] DB save error:', dbError)
      }
    }

    // 3. Create Dida Note
    console.log('[DailyNoteCallback] Creating Dida Note...')
    const didaNote = await createDidaNote(dida_token, dida_project_id, title, content, timeZone)
    console.log('[DailyNoteCallback] Note created:', didaNote?.id)

    return { status: 'success', noteId: didaNote?.id }
  }
  catch (e: any) {
    console.error('[DailyNoteCallback] Error processing callback:', e)
    return { status: 'error', message: e.message }
  }
})
