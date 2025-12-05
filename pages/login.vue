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
  <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-100 to-white dark:from-gray-900 dark:to-gray-800 p-4">
    <UCard class="w-full max-w-md shadow-xl ring-1 ring-gray-200 dark:ring-gray-700">
      <template #header>
        <div class="text-center">
          <h1 class="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
            {{ isLogin ? 'Welcome Back' : 'Create Account' }}
          </h1>
          <p class="text-gray-500 dark:text-gray-400">
            滴答清单之今日主人的任务
          </p>
        </div>
      </template>
      
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <UFormField label="Email" name="email" required>
          <UInput v-model="email" type="email" placeholder="your@email.com" icon="i-heroicons-envelope" size="lg" class="w-full" />
        </UFormField>
        
        <UFormField label="Password" name="password" required>
          <UInput v-model="password" type="password" placeholder="••••••••" icon="i-heroicons-lock-closed" size="lg" class="w-full" />
        </UFormField>

        <div v-if="error" class="p-3 rounded bg-red-50 text-red-600 text-sm border border-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
          {{ error }}
        </div>

        <UButton type="submit" block size="lg" :loading="loading" color="primary">
          {{ isLogin ? 'Sign In' : 'Sign Up' }}
        </UButton>
      </form>

      <template #footer>
        <div class="text-center text-sm text-gray-600 dark:text-gray-400">
          <button @click="isLogin = !isLogin" class="hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors">
            {{ isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in" }}
          </button>
        </div>
      </template>
    </UCard>
  </div>
</template>
