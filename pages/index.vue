<script setup lang="ts">
import { Icon } from '@iconify/vue'
import Modal from '@/components/ui/Modal.vue'
import ConfigSection from '@/components/ConfigSection.vue'
import DailyNoteAction from '@/components/FunctionCenter/DailyNoteAction.vue'
import WeeklyReportAction from '@/components/FunctionCenter/WeeklyReportAction.vue'
import TextToCalAction from '@/components/FunctionCenter/TextToCalAction.vue'
import ImageToCalAction from '@/components/FunctionCenter/ImageToCalAction.vue'
import TemplateCalAction from '@/components/FunctionCenter/TemplateCalAction.vue'

definePageMeta({
  middleware: 'auth'
})

const { user, logout } = useSession()
const { load, config, save, fetched } = useUserConfig()
const route = useRoute()
const router = useRouter()
const showConfigModal = ref(false)
const showUserMenu = ref(false)

// Close user menu on click outside
const userMenuRef = ref<HTMLElement | null>(null)
onMounted(() => {
  document.addEventListener('click', (e) => {
    if (userMenuRef.value && !userMenuRef.value.contains(e.target as Node)) {
      showUserMenu.value = false
    }
  })
})

// Initial Data Loading
watch(user, async (u) => {
   if (u) {
     // Check for token in query param (from OAuth callback)
     const tokenFromQuery = route.query.dida_token as string
     
     // Always load config to ensure freshness and correct user context
     await load()
     
     if (tokenFromQuery) {
       config.value.dida_token = tokenFromQuery
       await save()
       router.replace({ query: { ...route.query, dida_token: undefined } })
       showConfigModal.value = true // Open config if token was just set
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

const openConfig = () => {
  showConfigModal.value = true
  showUserMenu.value = false
}
</script>

<template>
  <div class="min-h-screen p-4 md:p-8 transition-colors duration-300 bg-gray-50 dark:bg-gray-900">
    <ClientOnly>
      <div class="max-w-5xl mx-auto">
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-center mb-8 bg-linear-to-r from-white to-indigo-50/60 dark:from-gray-800 dark:to-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all">
          <div class="flex items-center gap-4 mb-4 md:mb-0">
            <div class="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Icon icon="heroicons:check-circle" class="w-8 h-8" />
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                滴答：主人的任务
              </h1>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">主人的任务与时间管理</p>
            </div>
          </div>
          
          <div class="flex items-center gap-4 relative" ref="userMenuRef">
             <!-- User Profile / Menu -->
             <button 
               @click="showUserMenu = !showUserMenu"
               class="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors focus:outline-none"
             >
                <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg overflow-hidden">
                  <img v-if="user?.user_metadata?.picture" :src="user.user_metadata.picture" class="w-full h-full object-cover" />
                  <span v-else>{{ user?.user_metadata?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U' }}</span>
                </div>
                <div class="text-left hidden md:block">
                  <div class="text-sm font-medium text-gray-900 dark:text-white">{{ user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] }}</div>
                  <div class="text-xs text-green-500 font-medium flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    在线
                  </div>
                </div>
                <Icon icon="heroicons:chevron-down" class="w-4 h-4 text-gray-400" />
             </button>

             <!-- Dropdown Menu -->
             <div 
               v-if="showUserMenu"
               class="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-20 animate-fade-in origin-top-right"
             >
               <div class="p-2 space-y-1">
                 <button 
                   @click="openConfig"
                   class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                 >
                   <Icon icon="heroicons:cog-6-tooth" class="w-4 h-4" />
                   系统配置
                 </button>
                 <div class="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
                 <button 
                   @click="logout" 
                   class="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                 >
                   <Icon icon="heroicons:arrow-right-on-rectangle" class="w-4 h-4" />
                   退出登录
                 </button>
               </div>
             </div>
          </div>
        </div>

        <!-- Function Center (Actions) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DailyNoteAction @configure="openConfig" />
          <WeeklyReportAction @configure="openConfig" />
          <TextToCalAction @configure="openConfig" />
          <ImageToCalAction @configure="openConfig" />
          <TemplateCalAction @configure="openConfig" />
        </div>

        <!-- Config Modal -->
        <Modal v-model="showConfigModal" title="系统配置" maxWidth="max-w-5xl" :showHeader="false">
          <ConfigSection @close="showConfigModal = false" />
        </Modal>
      </div>
    </ClientOnly>
  </div>
</template>
