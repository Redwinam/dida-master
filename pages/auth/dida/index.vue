<script setup lang="ts">

const connect = () => {
  window.location.href = '/api/auth/dida/authorize'
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-linear-to-br from-primary-50 to-slate-50 dark:from-gray-900 dark:to-slate-900 p-4 transition-colors duration-300">
    <div class="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-2xl">
      <!-- Header -->
      <div class="px-8 pt-8 pb-6 text-center">
        <div class="flex justify-center mb-4">
          <Icon name="simple-icons:ticktick" class="w-16 h-16 text-blue-500" />
        </div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
          Connect Dida365
        </h1>
        <p class="text-gray-500 dark:text-gray-400 text-sm">
          Link your Dida365 account to enable task synchronization.
        </p>
      </div>

      <!-- Actions -->
      <div class="px-8 pb-8">
        <button
          class="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
          @click="connect"
        >
          <Icon name="heroicons:link" class="w-5 h-5 mr-2" />
          Connect Now
        </button>
      </div>
    </div>
  </div>
</template>
