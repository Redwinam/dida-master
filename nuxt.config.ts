import { defineNuxtConfig } from 'nuxt/config'
import tailwindcss from '@tailwindcss/vite'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'

const layerSupabasePlugin = (() => {
  const baseDir = join(process.cwd(), 'node_modules', '.c12')
  if (!existsSync(baseDir)) return null
  const candidates = readdirSync(baseDir).filter((name) => name.startsWith('github_Redwinam_if9_'))
  for (const name of candidates) {
    const pluginPath = join(baseDir, name, 'plugins', 'supabase.ts')
    if (existsSync(pluginPath)) return pluginPath
    const appPluginPath = join(baseDir, name, 'app', 'plugins', 'supabase.ts')
    if (existsSync(appPluginPath)) return appPluginPath
  }
  return null
})()

export default defineNuxtConfig({
  extends: [
    ['github:Redwinam/if9-supabase-auth#v0.1.5', { auth: process.env.GIGET_AUTH_TOKEN }]
  ],
  plugins: layerSupabasePlugin ? [layerSupabasePlugin] : [],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  sourcemap: {
    server: false,
    client: false
  },
  vite: {
    plugins: [
      tailwindcss()
    ],
    optimizeDeps: {
      include: ['buffer', 'process', 'tsdav', 'ical.js']
    }
  },
  app: {
    head: {
      title: '滴答：主人的任务',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }
      ]
    }
  },
  runtimeConfig: {
    didaToken: process.env.DIDA_TOKEN,
    didaProjectId: process.env.DIDA_PROJECT_ID,
    didaClientId: process.env.DIDA_CLIENT_ID,
    didaClientSecret: process.env.DIDA_CLIENT_SECRET,
    icloudUsername: process.env.ICLOUD_USERNAME,
    icloudAppPassword: process.env.ICLOUD_APP_PASSWORD,
    supabaseServiceKey: process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY,
    supabaseServiceRoleKey: process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY,
    siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY
    }
  }
})
