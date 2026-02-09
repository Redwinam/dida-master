import { defineNuxtConfig } from 'nuxt/config'
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  extends: ['@redwinam/if9-supabase-auth'],

  modules: ['@nuxt/eslint', '@nuxt/icon'],
  devtools: { enabled: true },
  devServer: { port: 7006 },

  app: {
    head: {
      title: '滴答：主人的任务',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap' },
      ],
    },
  },
  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    didaToken: process.env.DIDA_TOKEN,
    didaProjectId: process.env.DIDA_PROJECT_ID,
    didaClientId: process.env.DIDA_CLIENT_ID,
    didaClientSecret: process.env.DIDA_CLIENT_SECRET,
    // Generic CalDAV
    calUsername: process.env.CAL_USERNAME,
    calPassword: process.env.CAL_PASSWORD,
    calServerUrl: process.env.CAL_SERVER_URL,
    supabaseServiceKey: process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY,
    supabaseServiceRoleKey: process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY,
    siteUrl: process.env.NUXT_PUBLIC_SITE_URL,
    // Tencent Cloud COS
    tencentCosSecretId: process.env.NUXT_TENCENT_COS_SECRET_ID,
    tencentCosSecretKey: process.env.NUXT_TENCENT_COS_SECRET_KEY,
    tencentCosBucket: process.env.NUXT_TENCENT_COS_BUCKET,
    tencentCosRegion: process.env.NUXT_TENCENT_COS_REGION,
    // Tencent Cloud CDN
    tencentCdnAuthKey: process.env.NUXT_TENCENT_CDN_AUTH_KEY,
    tencentCdnAuthTtl: process.env.NUXT_TENCENT_CDN_AUTH_TTL,
    // Cron
    cronSecret: process.env.NUXT_CRON_SECRET,

    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
      tencentCdnDomain: process.env.NUXT_PUBLIC_TENCENT_CDN_DOMAIN,
    },
  },

  sourcemap: {
    server: false,
    client: false,
  },

  compatibilityDate: '2025-07-15',

  nitro: {
    imports: {
      dirs: ['server/utils'],
    },
    ...(process.env.EDGEONE_BUILD
      ? {
          output: {
            dir: '.edgeone',
            publicDir: '.edgeone/assets',
            serverDir: '.edgeone/server-handler',
          },
        }
      : {}),
  },

  vite: {
    plugins: [
      tailwindcss(),
    ],
    optimizeDeps: {
      include: ['buffer', 'process', 'tsdav', 'ical.js'],
    },
  },
  eslint: {
    config: {
      stylistic: true,
    },
  },
})
