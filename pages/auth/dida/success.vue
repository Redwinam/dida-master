<script setup lang="ts">
import { Icon } from '@iconify/vue'

const route = useRoute()
const token = route.query.token as string
const copied = ref(false)

const copyToken = () => {
  navigator.clipboard.writeText(token)
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-linear-to-br from-green-50 to-emerald-50 dark:from-gray-900 dark:to-emerald-900 p-4 transition-colors duration-300">
    <div class="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-green-100 dark:border-green-700 overflow-hidden transition-all duration-300 hover:shadow-2xl">
      <!-- Header -->
      <div class="px-8 pt-8 pb-6 text-center">
        <div class="flex justify-center mb-4">
          <div class="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
            <Icon icon="heroicons:check-circle" class="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
          Connection Successful!
        </h1>
        <p class="text-gray-500 dark:text-gray-400 text-sm">
          Your Dida365 account has been linked.
        </p>
      </div>

      <!-- Token Display -->
      <div class="px-8 pb-8 space-y-4">
        <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 relative group">
          <p class="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">
            Access Token
          </p>
          <code class="block text-sm text-gray-800 dark:text-gray-200 break-all font-mono max-h-32 overflow-y-auto">
            {{ token }}
          </code>
          <button
            class="absolute top-2 right-2 p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
            title="Copy Token"
            @click="copyToken"
          >
            <Icon :icon="copied ? 'heroicons:check' : 'heroicons:clipboard'" class="w-4 h-4" />
          </button>
        </div>

        <NuxtLink
          to="/"
          class="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
        >
          Go to Dashboard
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
