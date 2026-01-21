import { createClient } from '@supabase/supabase-js'
import { H3Event, getHeader, getCookie } from 'h3'

export const getUserClient = (event: H3Event) => {
  const config = useRuntimeConfig()
  const token = getHeader(event, 'Authorization')?.replace('Bearer ', '') || getCookie(event, 'sb-access-token')
  
  if (!token) {
     return createClient(config.public.supabaseUrl, config.public.supabaseKey)
  }

  return createClient(config.public.supabaseUrl, config.public.supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  })
}
