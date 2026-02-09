<script setup lang="ts">

const connect = () => {
  window.location.href = '/api/auth/dida/authorize'
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-linear-to-br from-primary-50 via-white to-accent-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4 transition-colors duration-300">
    <div class="w-full max-w-md animate-content-in">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <!-- Gradient accent bar -->
        <div class="h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-primary-400"></div>

        <!-- Header with Logo -->
        <div class="px-8 pt-8 pb-6 text-center">
          <div class="flex justify-center mb-5">
            <div class="w-12 h-12">
              <Logo class="w-full h-full drop-shadow-lg" />
            </div>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
            Connect Dida365
          </h1>
          <p class="text-gray-400 dark:text-gray-500 text-sm">
            Link your Dida365 account to enable task synchronization.
          </p>
        </div>

        <!-- Actions -->
        <div class="px-8 pb-8">
          <button
            class="w-full flex justify-center items-center py-3 px-4 rounded-lg text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
            @click="connect"
          >
            <Icon name="heroicons:link" class="w-5 h-5 mr-2" />
            Connect Now
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
