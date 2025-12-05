import { ref } from 'vue'
import { useNuxtApp } from '#app'
import { useI18n } from '../src/utils/i18n'

export function useAuth() {
  const { $supabase } = useNuxtApp()
  // Fallback if $supabase is not found (e.g. strict injection), though useNuxtApp should have it
  const supabase = $supabase as any 

  const { t } = useI18n()

  const pending = ref(false)
  const error = ref('')
  const success = ref('')

  function normalizeError(e: any) {
    const msg = (e.message || '').toLowerCase()
    if (msg.includes('rate limit')) return t('login.error.rateLimit')
    if (msg.includes('invalid login credentials')) return t('login.error.invalidCredentials')
    if (msg.includes('user not found')) return t('login.error.userNotFound')
    if (msg.includes('already registered')) return t('login.error.alreadyRegistered')
    return e.message || t('login.error.default')
  }

  async function resetPassword(email: string, redirectTo?: string) {
    if (!email) {
      error.value = t('login.enterEmail')
      return false
    }
    pending.value = true
    error.value = ''
    success.value = ''

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo || window.location.origin + '/reset-password',
      })

      if (resetError) throw resetError

      success.value = t('login.resetEmailSent')
      return true
    } catch (e: any) {
      error.value = normalizeError(e)
      return false
    } finally {
      pending.value = false
    }
  }

  async function sendOtp(email: string, isRegister: boolean, password?: string) {
    if (!email) {
      error.value = t('login.enterEmail')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      error.value = t('login.invalidEmail')
      return false
    }
    
    if (isRegister && !password) {
      error.value = t('login.setPwdForSafety')
      return false
    }

    pending.value = true
    error.value = ''
    success.value = ''

    try {
      if (isRegister) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })

        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            throw new Error(t('login.emailRegistered'))
          }
          throw signUpError
        }

        if (data.user && data.user.identities && data.user.identities.length === 0) {
          throw new Error(t('login.emailRegistered'))
        }

        if (data.session) {
          // Already logged in (no verification needed)
          return { session: data.session }
        }
      } else {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
        })
        if (otpError) throw otpError
      }

      success.value = t('login.codeSent')
      return true
    } catch (e: any) {
      error.value = normalizeError(e)
      return false
    } finally {
      pending.value = false
    }
  }

  async function verifyOtp(email: string, token: string) {
    if (!email || !token) return false

    pending.value = true
    error.value = ''
    success.value = ''

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup'
      })

      if (verifyError) throw verifyError

      return data
    } catch (e: any) {
      error.value = normalizeError(e)
      return false
    } finally {
      pending.value = false
    }
  }

  async function loginWithPassword(email: string, password?: string) {
    if (!email || !password) return false
    pending.value = true
    error.value = ''
    success.value = ''
    
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) throw signInError

      return data
    } catch (e: any) {
      error.value = normalizeError(e)
      return false
    } finally {
      pending.value = false
    }
  }

  return {
    pending,
    error,
    success,
    resetPassword,
    sendOtp,
    verifyOtp,
    loginWithPassword,
    normalizeError
  }
}
