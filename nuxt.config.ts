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
    siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://dida-master.if9.cool',

    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
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
