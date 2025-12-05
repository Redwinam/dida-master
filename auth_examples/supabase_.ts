import { createClient } from '@supabase/supabase-js'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig().public
  const supabase = createClient(config.supabaseUrl as string, config.supabaseAnonKey as string)
  nuxtApp.vueApp.provide('$supabase', supabase)
})
