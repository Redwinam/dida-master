<script setup lang="ts">

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
  <div class="flex min-h-screen items-center justify-center bg-linear-to-br from-green-50 via-white to-emerald-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4 transition-colors duration-300">
    <div class="w-full max-w-md animate-content-in">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <!-- Gradient accent bar -->
        <div class="h-1 bg-gradient-to-r from-green-600 via-green-400 to-emerald-400"></div>

        <!-- Header with Logo -->
        <div class="px-8 pt-8 pb-6 text-center">
          <div class="flex justify-center mb-5">
            <div class="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Icon name="heroicons:check-circle" class="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
            Connection Successful!
          </h1>
          <p class="text-gray-400 dark:text-gray-500 text-sm">
            Your Dida365 account has been linked.
          </p>
        </div>

        <!-- Token Display -->
        <div class="px-8 pb-8 space-y-4">
          <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700 relative group">
            <p class="text-[11px] text-gray-400 dark:text-gray-500 uppercase font-semibold tracking-wider mb-1.5">
              Access Token
            </p>
            <code class="block text-sm text-gray-800 dark:text-gray-200 break-all font-mono max-h-32 overflow-y-auto">
              {{ token }}
            </code>
            <button
              class="absolute top-2 right-2 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"
              title="Copy Token"
              @click="copyToken"
            >
              <Icon :name="copied ? 'heroicons:check' : 'heroicons:clipboard'" class="w-4 h-4" />
            </button>
          </div>

          <NuxtLink
            to="/"
            class="w-full flex justify-center items-center py-3 px-4 rounded-lg text-base font-semibold text-white bg-green-600 hover:bg-green-700 hover:shadow-lg hover:shadow-green-500/25 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
          >
            Go to Dashboard
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
