<script setup lang="ts">
import { Icon } from '@iconify/vue'

const { notifications, remove } = useToast()
</script>

<template>
  <div class="bg-gray-50 dark:bg-gray-950 min-h-screen text-gray-900 dark:text-gray-100 font-sans antialiased selection:bg-primary-500 selection:text-white">
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <!-- Toast Container -->
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <TransitionGroup 
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="transform translate-y-2 opacity-0"
        enter-to-class="transform translate-y-0 opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="transform translate-y-0 opacity-100"
        leave-to-class="transform translate-y-2 opacity-0"
      >
        <div 
          v-for="n in notifications" 
          :key="n.id"
          class="pointer-events-auto w-80 bg-white dark:bg-gray-800 shadow-lg rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-start gap-3"
        >
          <div class="shrink-0 mt-0.5">
            <Icon v-if="n.color === 'success'" icon="heroicons:check-circle" class="w-5 h-5 text-green-500" />
            <Icon v-else-if="n.color === 'error'" icon="heroicons:x-circle" class="w-5 h-5 text-red-500" />
            <Icon v-else icon="heroicons:information-circle" class="w-5 h-5 text-primary-500" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-medium text-gray-900 dark:text-white">{{ n.title }}</h3>
            <p v-if="n.description" class="mt-1 text-sm text-gray-500 dark:text-gray-400 wrap-break-word">{{ n.description }}</p>
          </div>
          <button @click="remove(n.id)" class="shrink-0 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors">
            <Icon icon="heroicons:x-mark" class="w-5 h-5" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>
