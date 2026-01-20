export default defineEventHandler(async (event) => {
  const client = getUserClient(event)
  const { data: { user }, error: userError } = await client.auth.getUser()
  if (userError || !user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const supabaseAdmin = getAdminClient()
  
  // Remove api_key from metadata
  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { 
    user_metadata: { ...user.user_metadata, api_key: null } 
  })
  
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  
  return { success: true }
})
