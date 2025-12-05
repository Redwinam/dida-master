import { serverSupabaseClient } from '#supabase/server'

function generateKey() {
  const arr = Array.from(crypto.getRandomValues(new Uint8Array(24)))
  const hex = arr.map(b => b.toString(16).padStart(2, '0')).join('')
  return `sk-${hex}`
}

export default defineEventHandler(async (event) => {
  // Use getUser to verify session from Supabase explicitly
  const client = await serverSupabaseClient(event)
  const { data: { user }, error: userError } = await client.auth.getUser()

  if (userError || !user) {
    console.error('API Key Post: Auth Error:', userError)
    throw createError({ statusCode: 401, message: 'Unauthorized: ' + (userError?.message || 'No user') })
  }


  const body = await readBody(event)
  // Allow manual setting of API key if provided in body, otherwise generate new one
  const key = body?.apiKey || generateKey()
  
  const supabaseAdmin = getAdminClient()
  
  console.log('API Key Post: User Object:', JSON.stringify(user, null, 2))
  
  // Ensure user.id is treated as string and validate if needed
  if (!user?.id) {
      // Fallback: Try to get user via client if serverSupabaseUser failed partially
      // This is rare but possible in some Nuxt/Supabase versions
      throw createError({ statusCode: 400, statusMessage: 'User ID missing from session' })
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { 
    user_metadata: { ...user.user_metadata, api_key: key } 
  })
  
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  
  return { apiKey: key }
})

