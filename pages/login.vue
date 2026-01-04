<script setup lang="ts">
import { Icon } from '@iconify/vue'

// Use auth composable from layer
const { 
  loginWithPassword, 
  sendOtp, 
  pending, 
  error: authError,
  success
} = useAuth()

const user = useSupabaseUser()
const router = useRouter()

const isLogin = ref(true)
const email = ref('')
const password = ref('')

// Map standardized error codes to messages
function getErrorMessage(code: string | null) {
  if (!code) return ''
  if (!code.startsWith('auth/')) return code

  const map: Record<string, string> = {
    'auth/rate-limit': 'Too many requests. Please try again later.',
    'auth/invalid-credentials': 'Invalid email or password.',
    'auth/user-not-found': 'User not found.',
    'auth/already-registered': 'User already registered.',
    'auth/email-required': 'Email is required.',
    'auth/email-invalid': 'Invalid email address.',
    'auth/password-required-for-signup': 'Password is required for signup.',
    'auth/unknown-error': 'An unknown error occurred.'
  }

  return map[code] || 'An error occurred.'
}

const displayError = computed(() => getErrorMessage(authError.value))

watchEffect(() => {
  if (user.value) {
    // Add a small delay to ensure auth state is stable
    setTimeout(() => {
      router.push('/')
    }, 100)
  }
})

async function handleSubmit() {
  if (isLogin.value) {
    await loginWithPassword(email.value, password.value)
  } else {
    // Register: sendOtp with isRegister=true and password
    await sendOtp(email.value, true, password.value)
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-linear-to-br from-indigo-50 to-slate-50 dark:from-gray-900 dark:to-slate-900 p-4 transition-colors duration-300">
    <div class="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-2xl">
      
      <!-- Header -->
      <div class="px-8 pt-8 pb-6 text-center">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
          {{ isLogin ? 'Welcome Back' : 'Create Account' }}
        </h1>
        <p class="text-gray-500 dark:text-gray-400 text-sm">
          滴答清单之今日主人的任务
        </p>
      </div>
      
      <!-- Form -->
      <div class="px-8 pb-8">
        <form @submit.prevent="handleSubmit" class="space-y-5">
          
          <!-- Email -->
          <div class="space-y-1.5">
            <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon icon="heroicons:envelope" class="h-5 w-5 text-gray-400" />
              </div>
              <input 
                id="email"
                v-model="email" 
                type="email" 
                required
                placeholder="your@email.com"
                class="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 sm:text-sm" 
              />
            </div>
          </div>
          
          <!-- Password -->
          <div class="space-y-1.5">
            <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon icon="heroicons:lock-closed" class="h-5 w-5 text-gray-400" />
              </div>
              <input 
                id="password"
                v-model="password" 
                type="password" 
                required
                placeholder="••••••••"
                class="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 sm:text-sm" 
              />
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="displayError" class="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30 flex items-center gap-2">
            <Icon icon="heroicons:exclamation-circle" class="w-5 h-5 shrink-0" />
            <span>{{ displayError }}</span>
          </div>
          
          <!-- Success Message (e.g. for OTP sent) -->
          <div v-if="success" class="p-3 rounded-lg bg-green-50 text-green-600 text-sm border border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30 flex items-center gap-2">
             <Icon icon="heroicons:check-circle" class="w-5 h-5 shrink-0" />
             <span>{{ success === 'auth/otp-sent' ? 'Confirmation email sent. Please check your inbox.' : success }}</span>
          </div>

          <!-- Submit Button -->
          <button 
            type="submit" 
            :disabled="pending"
            class="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <Icon v-if="pending" icon="line-md:loading-twotone-loop" class="w-5 h-5 mr-2" />
            {{ isLogin ? 'Sign In' : 'Sign Up' }}
          </button>
        </form>
      </div>

      <!-- Footer -->
      <div class="px-8 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 text-center">
        <button 
          @click="isLogin = !isLogin" 
          class="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors focus:outline-none"
        >
          {{ isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in" }}
        </button>
      </div>
    </div>
  </div>
</template>
