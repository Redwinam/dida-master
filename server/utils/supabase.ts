import { createClient } from '@supabase/supabase-js'

export const getAdminClient = () => {
  const config = useRuntimeConfig()
  // Ensure we have the service role key
  const supabaseUrl = config.public.supabase.url
  const serviceRoleKey = config.supabase.serviceKey

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase URL or Service Role Key')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
