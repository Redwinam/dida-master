import { defineNuxtConfig } from 'nuxt/config'
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  extends: [
    ['github:Redwinam/if9-supabase-auth#v0.1.3', { auth: process.env.GIGET_AUTH_TOKEN }]
  ],
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
    }
  },
  runtimeConfig: {
    openaiApiKey: process.env.LLM_API_KEY,
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
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
      llmModel: process.env.LLM_MODEL || 'deepseek-ai/DeepSeek-V3.2-Exp',
      llmApiUrl: process.env.LLM_API_URL || 'https://api.siliconflow.cn/v1/chat/completions'
    }
  }
})
