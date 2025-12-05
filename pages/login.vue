<script setup lang="ts">
const { login, register, loading, error } = useAuth()
const user = useSupabaseUser()
const router = useRouter()

const isLogin = ref(true)
const email = ref('')
const password = ref('')

watchEffect(() => {
  if (user.value) {
    router.push('/')
  }
})

async function handleSubmit() {
  if (isLogin.value) {
    await login(email.value, password.value)
  } else {
    await register(email.value, password.value)
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div class="w-full max-w-md p-8 space-y-6 bg-white rounded shadow-md dark:bg-gray-800">
      <h2 class="text-2xl font-bold text-center text-gray-900 dark:text-white">
        {{ isLogin ? '登录' : '注册' }}
      </h2>
      
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
          <UInput v-model="email" type="email" required placeholder="your@email.com" />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
          <UInput v-model="password" type="password" required placeholder="********" />
        </div>

        <div v-if="error" class="text-red-500 text-sm">
          {{ error }}
        </div>

        <UButton type="submit" block :loading="loading">
          {{ isLogin ? '登录' : '注册' }}
        </UButton>
      </form>

      <div class="text-center text-sm text-gray-600 dark:text-gray-400">
        <button @click="isLogin = !isLogin" class="hover:underline">
          {{ isLogin ? '没有账号？去注册' : '已有账号？去登录' }}
        </button>
      </div>
    </div>
  </div>
</template>
