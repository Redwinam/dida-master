<script setup lang="ts">
import { Icon } from '@iconify/vue'
import ConfigSection from '@/components/ConfigSection.vue'
import DailyNoteAction from '@/components/FunctionCenter/DailyNoteAction.vue'
import WeeklyReportAction from '@/components/FunctionCenter/WeeklyReportAction.vue'
import TextToCalAction from '@/components/FunctionCenter/TextToCalAction.vue'
import ImageToCalAction from '@/components/FunctionCenter/ImageToCalAction.vue'

definePageMeta({
  middleware: 'auth'
})

const { user, logout } = useSession()
const { load, config, save, fetched } = useUserConfig()
const route = useRoute()
const router = useRouter()
const client = useSupabaseClient()

const activeTab = ref<'config' | 'actions'>('config')

// Initial Data Loading
watch(user, async (u) => {
   if (u) {
     // Check for token in query param (from OAuth callback)
     const tokenFromQuery = route.query.dida_token as string
     
     if (!fetched.value) {
        await load()
     }
     
     if (tokenFromQuery) {
       config.value.dida_token = tokenFromQuery
       await save()
       router.replace({ query: { ...route.query, dida_token: undefined } })
       // Optional: fetch projects immediately if needed, but DidaConfig handles lazy loading now.
       // We might want to trigger a fetch to populate the name if possible, but 
       // DidaConfig will just show the ID or "Connected". 
       // User can click edit to see details.
     }
   }
}, { immediate: true })

// Safety check: if loading gets stuck for some reason (e.g. hydration mismatch), reset it after mount
onMounted(() => {
    // Wait a bit for initial fetch to potentially start/finish
    setTimeout(() => {
        if (config.value.dida_token === '' && !fetched.value && !useUserConfig().loading.value) {
             // If nothing loaded and not loading, try loading
             load()
        }
        
        // If still loading after 10s, force reset
        if (useUserConfig().loading.value) {
            console.warn('Loading stuck detected, resetting...')
            useUserConfig().loading.value = false
        }
    }, 5000)
})
</script>

<template>
  <div class="min-h-screen p-4 md:p-8 transition-colors duration-300 bg-gray-50 dark:bg-gray-900">
    <ClientOnly>
      <div class="max-w-5xl mx-auto">
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-center mb-8 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all">
          <div class="flex items-center gap-4 mb-4 md:mb-0">
            <div class="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Icon icon="heroicons:check-circle" class="w-8 h-8" />
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                滴答：主人的任务
              </h1>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Task Master & Time Management</p>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-right hidden md:block">
              <div class="text-sm font-medium text-gray-900 dark:text-white">{{ user?.email }}</div>
              <div class="text-xs text-green-500 font-medium flex items-center justify-end gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Online
              </div>
            </div>
            <button 
              @click="logout" 
              class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Icon icon="heroicons:arrow-right-on-rectangle" class="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        <!-- Tabs Navigation -->
        <div class="flex space-x-1 rounded-xl bg-gray-200/50 dark:bg-gray-800/50 p-1 mb-8 w-full md:w-fit">
          <button
            v-for="tab in ['config', 'actions']"
            :key="tab"
            @click="activeTab = tab as any"
            :class="[
              'w-full md:w-auto flex items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium leading-5 transition-all duration-200',
              activeTab === tab
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-white/12 hover:text-gray-800 dark:hover:text-gray-200'
            ]"
          >
            <Icon :icon="tab === 'config' ? 'heroicons:cog-6-tooth' : 'heroicons:bolt'" class="w-5 h-5" />
            {{ tab === 'config' ? '系统配置' : '功能中心' }}
          </button>
        </div>

        <!-- Config Tab -->
        <div v-if="activeTab === 'config'">
          <ConfigSection />
        </div>

        <!-- Actions Tab -->
        <div v-else-if="activeTab === 'actions'" class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DailyNoteAction />
          <WeeklyReportAction />
          <TextToCalAction />
          <ImageToCalAction />
        </div>
      </div>
    </ClientOnly>
  </div>
</template>
