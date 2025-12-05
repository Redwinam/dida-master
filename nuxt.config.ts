// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/supabase',
    '@nuxt/ui'
  ],
  supabase: {
    redirect: false,
    url: process.env.NUXT_PUBLIC_SUPABASE_URL,
    key: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY
  },
  runtimeConfig: {
    // Private keys are only available on the server
    // Note: These are now largely superseded by database configuration, 
    // but kept here if we want to support env var overrides in the future.
    // Since the .env no longer has them, they will be undefined.
    openaiApiKey: process.env.LLM_API_KEY,
    didaToken: process.env.DIDA_TOKEN,
    didaProjectId: process.env.DIDA_PROJECT_ID,
    icloudUsername: process.env.ICLOUD_USERNAME,
    icloudAppPassword: process.env.ICLOUD_APP_PASSWORD,
    
    // Public keys that are exposed to the client
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
      llmModel: process.env.LLM_MODEL || 'deepseek-ai/DeepSeek-V3.1',
      llmApiUrl: process.env.LLM_API_URL || 'https://api.siliconflow.cn/v1/chat/completions'
    }
  }
})
