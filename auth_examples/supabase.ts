import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

export function getUserClient(event: H3Event) {
  const config = useRuntimeConfig()
  const authHeader = getHeader(event, 'authorization') || ''
  if (!authHeader.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Missing Authorization header' })
  }
  if (!config.public.supabaseUrl || !config.public.supabaseAnonKey) {
    throw createError({ statusCode: 500, statusMessage: 'Supabase config not configured' })
  }
  const supabase = createClient(
    config.public.supabaseUrl as string,
    config.public.supabaseAnonKey as string,
    { global: { headers: { Authorization: authHeader } } }
  )
  return supabase
}

export function getAdminClient() {
  const config = useRuntimeConfig()
  const key = config.supabaseServiceRoleKey as string
  if (!key) {
    throw createError({ statusCode: 500, statusMessage: 'Service role key not configured' })
  }
  if (!config.public.supabaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Supabase URL not configured' })
  }
  const supabase = createClient(
    config.public.supabaseUrl as string,
    key
  )
  return supabase
}

export async function getCurrentUserId(event: H3Event) {
  const userClient = getUserClient(event)
  const { data, error } = await userClient.auth.getUser()
  if (error || !data?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return data.user.id
}
