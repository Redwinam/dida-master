/**
 * Migration script: Re-migrate with unique COS keys (date_recordId format)
 * Reads content from old COS keys, re-uploads with new keys, updates DB
 * Usage: node --env-file=.env scripts/migrate-to-cos.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { createHmac, createHash } from 'crypto'

// ---- Config from .env ----
const SUPABASE_URL = process.env.NUXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY
const COS_SECRET_ID = process.env.NUXT_TENCENT_COS_SECRET_ID
const COS_SECRET_KEY = process.env.NUXT_TENCENT_COS_SECRET_KEY
const COS_BUCKET = process.env.NUXT_TENCENT_COS_BUCKET
const COS_REGION = process.env.NUXT_TENCENT_COS_REGION

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE env vars')
  process.exit(1)
}
if (!COS_SECRET_ID || !COS_SECRET_KEY || !COS_BUCKET || !COS_REGION) {
  console.error('Missing COS env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const COS_HOST = `${COS_BUCKET}.cos.${COS_REGION}.myqcloud.com`

// ---- COS Signing ----
function hmacSha1Hex(key, msg) {
  return createHmac('sha1', key).update(msg).digest('hex')
}

function sha1Hex(msg) {
  return createHash('sha1').update(msg).digest('hex')
}

function generateCOSAuth(method, cosKey) {
  const now = Math.floor(Date.now() / 1000)
  const expiry = now + 600
  const keyTime = `${now};${expiry}`

  const signKey = hmacSha1Hex(COS_SECRET_KEY, keyTime)
  const httpMethod = method.toLowerCase()
  const uriPathname = cosKey.startsWith('/') ? cosKey : `/${cosKey}`

  const headerList = 'host'
  const headerString = `host=${encodeURIComponent(COS_HOST)}`

  const httpString = `${httpMethod}\n${uriPathname}\n\n${headerString}\n`
  const sha1HttpStr = sha1Hex(httpString)
  const stringToSign = `sha1\n${keyTime}\n${sha1HttpStr}\n`
  const signature = hmacSha1Hex(signKey, stringToSign)

  return `q-sign-algorithm=sha1&q-ak=${COS_SECRET_ID}&q-sign-time=${keyTime}&q-key-time=${keyTime}&q-header-list=${headerList}&q-url-param-list=&q-signature=${signature}`
}

async function uploadToCOS(key, content) {
  const url = `https://${COS_HOST}/${key}`
  const body = Buffer.from(content, 'utf-8')
  const auth = generateCOSAuth('PUT', key)

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Host': COS_HOST,
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': String(body.byteLength),
      'Authorization': auth,
    },
    body,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`COS ${res.status}: ${text}`)
  }
  return true
}

async function getFromCOS(key) {
  const url = `https://${COS_HOST}/${key}`
  const auth = generateCOSAuth('GET', key)

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Host': COS_HOST,
      'Authorization': auth,
    },
  })

  if (!res.ok) {
    throw new Error(`COS GET ${res.status}`)
  }
  return await res.text()
}

// ---- New key format: includes record ID ----
function dailyNoteCOSKey(userId, noteDate, recordId) {
  return `dida-master/${userId}/daily-notes/${noteDate}_${recordId}.json`
}

function weeklyReportCOSKey(userId, periodStart, periodEnd, recordId) {
  return `dida-master/${userId}/weekly-reports/${periodStart}_${periodEnd}_${recordId}.json`
}

// ---- Migration ----
async function main() {
  console.log('=== Re-migrating with unique COS keys ===\n')

  // 1. Daily notes - read from old COS key, re-upload with new key
  console.log('--- Daily Notes ---')
  const { data: dailyNotes, error: dnErr } = await supabase
    .from('dida_master_daily_notes')
    .select('*')
    .not('cos_key', 'is', null)

  if (dnErr) {
    console.error('Failed to fetch daily notes:', dnErr)
  }
  else {
    console.log(`Found ${dailyNotes.length} daily notes to re-key`)
    for (const note of dailyNotes) {
      const newKey = dailyNoteCOSKey(note.user_id, note.note_date, note.id)

      // Skip if already has the new format
      if (note.cos_key === newKey) {
        console.log(`  [SKIP] ${note.title} - already correct`)
        continue
      }

      try {
        // Read content from old COS key
        const cosContent = await getFromCOS(note.cos_key)

        // Upload with new key
        await uploadToCOS(newKey, cosContent)

        // Update DB
        const { error: updateErr } = await supabase
          .from('dida_master_daily_notes')
          .update({ cos_key: newKey })
          .eq('id', note.id)

        if (updateErr) {
          console.error(`  [FAIL] ${note.title} - DB: ${updateErr.message}`)
        }
        else {
          console.log(`  [OK] ${note.title} -> ${newKey}`)
        }
      }
      catch (e) {
        console.error(`  [FAIL] ${note.title} (${note.id}) - ${e.message}`)
      }
    }
  }

  // 2. Weekly reports
  console.log('\n--- Weekly Reports ---')
  const { data: weeklyReports, error: wrErr } = await supabase
    .from('dida_master_weekly_reports')
    .select('*')
    .not('cos_key', 'is', null)

  if (wrErr) {
    console.error('Failed to fetch weekly reports:', wrErr)
  }
  else {
    console.log(`Found ${weeklyReports.length} weekly reports to re-key`)
    for (const report of weeklyReports) {
      const newKey = weeklyReportCOSKey(report.user_id, report.period_start, report.period_end, report.id)

      if (report.cos_key === newKey) {
        console.log(`  [SKIP] ${report.title} - already correct`)
        continue
      }

      try {
        const cosContent = await getFromCOS(report.cos_key)
        await uploadToCOS(newKey, cosContent)

        const { error: updateErr } = await supabase
          .from('dida_master_weekly_reports')
          .update({ cos_key: newKey })
          .eq('id', report.id)

        if (updateErr) {
          console.error(`  [FAIL] ${report.title} - DB: ${updateErr.message}`)
        }
        else {
          console.log(`  [OK] ${report.title} -> ${newKey}`)
        }
      }
      catch (e) {
        console.error(`  [FAIL] ${report.title} (${report.id}) - ${e.message}`)
      }
    }
  }

  console.log('\n=== Re-migration Complete ===')
}

main().catch(console.error)
