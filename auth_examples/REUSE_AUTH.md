# Reusing Supabase Authentication Logic

This project's authentication logic has been extracted into a reusable composable and server utilities. To reuse this logic in a sibling project (assuming it's also Nuxt 3 or a similar Vue environment), follow these steps:

## 1. Copy the Composable

Copy the file `composables/useAuth.ts` to your project's `composables/` directory.

This file encapsulates:
- Login with password
- Registration
- Sending OTP/Magic Links
- Resetting Password
- Error normalization

## 2. Setup Supabase Client

Ensure your project has a Supabase client available.
In this project, it is provided via `plugins/supabase.ts`.

**Requirements:**
- Install `@supabase/supabase-js`
- Configure `supabaseUrl` and `supabaseAnonKey` in your `.env` and `nuxt.config.ts`.

Example `plugins/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig().public
  const supabase = createClient(config.supabaseUrl as string, config.supabaseAnonKey as string)
  nuxtApp.vueApp.provide('$supabase', supabase)
})
```

## 3. Server-Side Utilities (Optional)

If you need server-side authentication (verifying tokens in API routes), copy `server/utils/supabase.ts`.

## 4. Usage in Components

```vue
<script setup>
const { 
  loginWithPassword, 
  sendOtp, 
  error, 
  pending 
} = useAuth()

async function handleLogin() {
  const result = await loginWithPassword('email@example.com', 'password')
  if (result?.user) {
    // Logged in
  }
}
</script>
```

## 5. i18n Dependency

The `useAuth` composable uses `useI18n` for error messages.
- If your project uses `vue-i18n` or a similar solution, ensure `useI18n` is available or modify `composables/useAuth.ts` to use your translation logic.
- Alternatively, strip the `normalizeError` function if you prefer to handle raw errors.
