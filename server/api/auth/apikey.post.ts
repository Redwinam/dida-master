import { serverSupabaseUser } from '#supabase/server'

function generateKey() {
  const arr = Array.from(crypto.getRandomValues(new Uint8Array(24)))
  const hex = arr.map(b => b.toString(16).padStart(2, '0')).join('')
  return `sk-${hex}`
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  // Allow manual setting of API key if provided in body, otherwise generate new one
  const key = body?.apiKey || generateKey()
  
  const supabaseAdmin = getAdminClient()
  
  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { 
    user_metadata: { ...user.user_metadata, api_key: key } 
  })
  
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  
  return { apiKey: key }
})

