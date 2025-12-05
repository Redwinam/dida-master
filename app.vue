<template>
  <div class="bg-gray-50 dark:bg-gray-950 min-h-screen text-gray-900 dark:text-gray-100">
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <UApp>
      <!-- Nuxt UI v3/v4 toast container often requires UApp or specific container -->
    </UApp>
  </div>
</template>
