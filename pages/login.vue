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
const showPassword = ref(false)

// Map standardized error codes to messages
function getErrorMessage(code: string | null) {
  if (!code) return ''
  if (!code.startsWith('auth/')) return code

  const map: Record<string, string> = {
    'auth/rate-limit': '请求过于频繁，请稍后再试。',
    'auth/invalid-credentials': '邮箱或密码不正确。',
    'auth/user-not-found': '找不到该用户。',
    'auth/already-registered': '该邮箱已注册。',
    'auth/email-required': '请输入邮箱地址。',
    'auth/email-invalid': '邮箱格式不正确。',
    'auth/password-required-for-signup': '注册时请设置密码。',
    'auth/unknown-error': '发生未知错误，请重试。',
  }

  return map[code] || '发生了一个错误。'
}

const displayError = computed(() => getErrorMessage(authError.value))

watchEffect(() => {
  if (user.value) {
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
    await sendOtp(email.value, true, password.value)
  }
}
</script>

<template>
  <div class="login-page relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 p-4">
    <!-- Decorative floating orbs -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="orb orb-1" />
      <div class="orb orb-2" />
      <div class="orb orb-3" />
      <div class="orb orb-4" />
    </div>

    <!-- Subtle grid pattern overlay -->
    <div class="absolute inset-0 opacity-[0.03] pointer-events-none" style="background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0); background-size: 40px 40px;" />

    <!-- Main card -->
    <div class="relative z-10 w-full max-w-[420px] animate-content-in">
      <!-- Logo & Title -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 mb-5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 shadow-lg shadow-primary-950/50 transition-transform duration-500 hover:scale-110 hover:rotate-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1389.8 1135.4" class="w-10 h-10 drop-shadow-lg">
            <path fill="white" d="M1363.4,653.8c-27.2,38.8-71.9,63.4-119.4,63.4h-718.6c-69.3,0-129.3-49.9-143.4-116.9-5.6-26.5-4.5-52.9,3.5-78,20.2-63.9,78.6-104.3,145.1-104.3l715.2.3c67,0,127.5,51.6,140.5,117.5,8,40.5,1.5,83.3-22.7,117.9h-.2Z" />
            <path fill="white" d="M1303.6,285.8c-18.3,8.1-38.4,13.4-58.5,13.4l-715.8.4c-53.3,0-101.8-25.9-129.4-71.7-19-31.5-25.7-68.3-18.9-106.1C392.4,58.5,449.7,1.5,517.2,1.4l732.5-.2c71.5,0,129.9,59.8,138.4,128,4.9,39-3.6,77.3-26.3,108.5-15.2,21-34,37.3-58.3,48.1h0Z" />
            <path fill="white" d="M1382.6,1033.7c-18,58.2-73.3,101.3-134.9,101.3l-723.5.4c-33.4,0-64.8-11.7-90.4-32.1-34.2-27.2-53-65.6-55.4-109.6-4.4-79.4,57.4-155.6,140.1-155.7l730.4-.9c29.9,0,57.9,11.7,81.3,28.7,51.8,37.8,71.5,106.1,52.4,167.8h0Z" />
            <circle fill="#f8867a" cx="149.8" cy="149.8" r="149.8" />
          </svg>
        </div>
        <h1 class="text-2xl font-black tracking-tight leading-tight mb-2">
          <span class="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">滴答：</span>
          <span class="text-accent-400">主人的任务</span>
        </h1>
        <p class="text-primary-300/70 text-xs tracking-wider uppercase">
          Master's Tasks & Time Management
        </p>
      </div>

      <!-- Glass card -->
      <div class="bg-white/[0.07] backdrop-blur-xl rounded-2xl border border-white/[0.12] shadow-2xl shadow-primary-950/50 overflow-hidden">
        <!-- Tab header -->
        <div class="flex border-b border-white/[0.08]">
          <button
            class="flex-1 py-3.5 text-sm font-semibold transition-all duration-300 relative"
            :class="isLogin ? 'text-white' : 'text-primary-400/60 hover:text-primary-300'"
            @click="isLogin = true"
          >
            登录
            <span v-if="isLogin" class="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-accent-400 rounded-full" />
          </button>
          <button
            class="flex-1 py-3.5 text-sm font-semibold transition-all duration-300 relative"
            :class="!isLogin ? 'text-white' : 'text-primary-400/60 hover:text-primary-300'"
            @click="isLogin = false"
          >
            注册
            <span v-if="!isLogin" class="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-accent-400 rounded-full" />
          </button>
        </div>

        <!-- Form -->
        <div class="p-7">
          <form class="space-y-5" @submit.prevent="handleSubmit">
            <!-- Email -->
            <div class="space-y-2">
              <label for="login-email" class="block text-xs font-semibold text-primary-200/80 tracking-wide uppercase">电子邮箱</label>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Icon name="lucide:mail" class="h-4.5 w-4.5 text-primary-400/50 group-focus-within:text-accent-400 transition-colors duration-200" />
                </div>
                <input
                  id="login-email"
                  v-model="email"
                  type="email"
                  required
                  autocomplete="email"
                  placeholder="your@email.com"
                  class="block w-full pl-11 pr-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-primary-400/40 focus:outline-none focus:ring-2 focus:ring-accent-400/50 focus:border-accent-400/30 focus:bg-white/[0.08] transition-all duration-200 text-sm"
                />
              </div>
            </div>

            <!-- Password -->
            <div class="space-y-2">
              <label for="login-password" class="block text-xs font-semibold text-primary-200/80 tracking-wide uppercase">密码</label>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Icon name="lucide:lock" class="h-4.5 w-4.5 text-primary-400/50 group-focus-within:text-accent-400 transition-colors duration-200" />
                </div>
                <input
                  id="login-password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  autocomplete="current-password"
                  placeholder="••••••••"
                  class="block w-full pl-11 pr-11 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-primary-400/40 focus:outline-none focus:ring-2 focus:ring-accent-400/50 focus:border-accent-400/30 focus:bg-white/[0.08] transition-all duration-200 text-sm"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-primary-400/50 hover:text-primary-200 transition-colors"
                  @click="showPassword = !showPassword"
                >
                  <Icon :name="showPassword ? 'lucide:eye-off' : 'lucide:eye'" class="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            <!-- Error Message -->
            <Transition
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="opacity-0 -translate-y-1"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 -translate-y-1"
            >
              <div v-if="displayError" class="p-3 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center gap-2.5">
                <Icon name="lucide:circle-alert" class="w-4.5 h-4.5 shrink-0 text-red-400" />
                <span class="text-sm text-red-300">{{ displayError }}</span>
              </div>
            </Transition>

            <!-- Success Message -->
            <Transition
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="opacity-0 -translate-y-1"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 -translate-y-1"
            >
              <div v-if="success" class="p-3 rounded-xl bg-green-500/15 border border-green-500/20 flex items-center gap-2.5">
                <Icon name="lucide:circle-check" class="w-4.5 h-4.5 shrink-0 text-green-400" />
                <span class="text-sm text-green-300">{{ success === 'auth/otp-sent' ? '确认邮件已发送，请检查收件箱。' : success }}</span>
              </div>
            </Transition>

            <!-- Submit Button -->
            <button
              type="submit"
              :disabled="pending"
              class="w-full flex justify-center items-center py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-accent-500 to-accent-400 hover:from-accent-400 hover:to-accent-300 shadow-lg shadow-accent-500/25 hover:shadow-accent-400/40 focus:outline-none focus:ring-2 focus:ring-accent-400/50 focus:ring-offset-2 focus:ring-offset-primary-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-accent-500/25 transition-all duration-300 active:scale-[0.98]"
            >
              <Icon v-if="pending" name="line-md:loading-twotone-loop" class="w-5 h-5 mr-2" />
              {{ isLogin ? '登录' : '注册' }}
            </button>
          </form>
        </div>
      </div>

      <!-- Footer text -->
      <p class="mt-6 text-center text-xs text-primary-400/50">
        © {{ new Date().getFullYear() }} 滴答：主人的任务
      </p>
    </div>
  </div>
</template>

<style scoped>
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
}

.orb-1 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, #f8867a33, transparent 70%);
  top: -10%;
  right: -5%;
  animation: float-1 20s ease-in-out infinite;
}

.orb-2 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, #4d72b833, transparent 70%);
  bottom: -5%;
  left: -5%;
  animation: float-2 25s ease-in-out infinite;
}

.orb-3 {
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, #f8867a22, transparent 70%);
  top: 50%;
  left: 20%;
  animation: float-3 18s ease-in-out infinite;
}

.orb-4 {
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, #4d72b822, transparent 70%);
  top: 20%;
  right: 25%;
  animation: float-4 22s ease-in-out infinite;
}

@keyframes float-1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-30px, 40px) scale(1.1); }
  66% { transform: translate(20px, -20px) scale(0.95); }
}

@keyframes float-2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(40px, -30px) scale(1.05); }
  66% { transform: translate(-20px, 30px) scale(1.1); }
}

@keyframes float-3 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(30px, -40px) scale(1.15); }
}

@keyframes float-4 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-25px, 25px) scale(1.08); }
}
</style>
