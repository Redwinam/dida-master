<script setup lang="ts">

// Use auth composable from layer
const {
  loginWithPassword,
  sendOtp,
  pending,
  error: authError,
  success,
} = useAuth()

const { user } = useSession()
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
    'auth/unknown-error': 'An unknown error occurred.',
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
  }
  else {
    // Register: sendOtp with isRegister=true and password
    await sendOtp(email.value, true, password.value)
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-linear-to-br from-primary-50 via-white to-accent-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4 transition-colors duration-300">
    <div class="w-full max-w-md animate-content-in">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <!-- Gradient accent bar -->
        <div class="h-1 bg-gradient-to-r from-primary-600 via-primary-400 to-accent-400"></div>

        <!-- Header with Logo -->
        <div class="px-8 pt-8 pb-6 text-center">
          <div class="flex justify-center mb-5">
            <div class="w-12 h-12">
              <Logo class="w-full h-full drop-shadow-lg" />
            </div>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-1.5 tracking-tight">
            {{ isLogin ? '欢迎回来' : '创建账户' }}
          </h1>
          <p class="text-gray-400 dark:text-gray-500 text-sm">
            滴答清单之今日主人的任务
          </p>
        </div>

        <!-- Form -->
        <div class="px-8 pb-8">
          <form class="space-y-5" @submit.prevent="handleSubmit">
            <!-- Email -->
            <div class="space-y-1.5">
              <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">电子邮箱</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Icon name="heroicons:envelope" class="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  v-model="email"
                  type="email"
                  required
                  placeholder="your@email.com"
                  class="block w-full pl-10 pr-3 py-2.5 sm:text-sm"
                />
              </div>
            </div>

            <!-- Password -->
            <div class="space-y-1.5">
              <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">密码</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Icon name="heroicons:lock-closed" class="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  v-model="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  class="block w-full pl-10 pr-3 py-2.5 sm:text-sm"
                />
              </div>
            </div>

            <!-- Error Message -->
            <div v-if="displayError" class="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30 flex items-center gap-2">
              <Icon name="heroicons:exclamation-circle" class="w-5 h-5 shrink-0" />
              <span>{{ displayError }}</span>
            </div>

            <!-- Success Message (e.g. for OTP sent) -->
            <div v-if="success" class="p-3 rounded-lg bg-green-50 text-green-600 text-sm border border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30 flex items-center gap-2">
              <Icon name="heroicons:check-circle" class="w-5 h-5 shrink-0" />
              <span>{{ success === 'auth/otp-sent' ? '确认邮件已发送，请检查收件箱。' : success }}</span>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              :disabled="pending"
              class="w-full flex justify-center items-center py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 hover:shadow-lg hover:shadow-primary-500/25 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-200"
            >
              <Icon v-if="pending" name="line-md:loading-twotone-loop" class="w-5 h-5 mr-2" />
              {{ isLogin ? '登录' : '注册' }}
            </button>
          </form>
        </div>

        <!-- Footer -->
        <div class="px-8 py-4 bg-gray-50/80 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 text-center">
          <button
            class="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 transition-colors focus:outline-none"
            @click="isLogin = !isLogin"
          >
            {{ isLogin ? "还没有账号？去注册" : "已有账号？去登录" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
