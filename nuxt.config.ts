import { resolve } from 'node:path'

// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from 'nuxt/config'
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  modules: [
    '@nuxtjs/supabase'
  ],
  supabase: {
    redirect: false,
    url: process.env.NUXT_PUBLIC_SUPABASE_URL,
    key: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY
  },
  vite: {
    plugins: [
      tailwindcss()
    ],
    resolve: {
      alias: {
        '@supabase/supabase-js': resolve(process.cwd(), 'node_modules/@supabase/supabase-js/dist/main/index.js')
      }
    },
    optimizeDeps: {
      include: ['buffer', 'process', '@supabase/supabase-js', 'tsdav', 'ical.js', 'openai']
    }
  },
  app: {
    head: {
      // Script injection removed in favor of plugins/polyfills.client.ts
    }
  },
  runtimeConfig: {
    openaiApiKey: process.env.LLM_API_KEY,
    didaToken: process.env.DIDA_TOKEN,
    didaProjectId: process.env.DIDA_PROJECT_ID,
    icloudUsername: process.env.ICLOUD_USERNAME,
    icloudAppPassword: process.env.ICLOUD_APP_PASSWORD,
    
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
      llmModel: process.env.LLM_MODEL || 'deepseek-ai/DeepSeek-V3.1',
      llmApiUrl: process.env.LLM_API_URL || 'https://api.siliconflow.cn/v1/chat/completions'
    }
  }
})
