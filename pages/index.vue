<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'
import Modal from '@/components/ui/Modal.vue'
import ConfigSection from '@/components/ConfigSection.vue'
import DailyNoteAction from '@/components/FunctionCenter/DailyNoteAction.vue'
import WeeklyReportAction from '@/components/FunctionCenter/WeeklyReportAction.vue'
import TextToCalAction from '@/components/FunctionCenter/TextToCalAction.vue'
import ImageToCalAction from '@/components/FunctionCenter/ImageToCalAction.vue'
import TemplateCalAction from '@/components/FunctionCenter/TemplateCalAction.vue'

definePageMeta({
  middleware: 'auth',
})

const { user, logout } = useSession()
const { load, config, save, fetched } = useUserConfig()
const route = useRoute()
const router = useRouter()
const showConfigModal = ref(false)

// Initial Data Loading
watch(user, async u => {
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

const configInitialTab = ref('dida')

const openConfig = (tab?: string) => {
  configInitialTab.value = tab || 'dida'
  showConfigModal.value = true
}

const displayName = computed(() => {
  return user.value?.user_metadata?.name || user.value?.user_metadata?.full_name || user.value?.email?.split('@')[0] || ''
})

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})
</script>

<template>
  <div class="min-h-screen transition-colors duration-300 bg-gray-50 dark:bg-gray-900">
    <ClientOnly>
      <div class="max-w-5xl mx-auto px-4 md:px-8 pb-16">
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-center pt-8 md:pt-12 mb-10 relative z-40">
          <div class="mb-6 md:mb-0 flex flex-col md:flex-row items-center gap-4 md:gap-5">
            <div class="w-10 h-10 flex-shrink-0 transition-transform duration-500 hover:scale-110 hover:rotate-3">
              <Logo class="w-full h-full drop-shadow-lg" />
            </div>
            <div class="text-center md:text-left">
              <h1 class="text-2xl font-extrabold tracking-tight leading-tight">
                <span class="bg-clip-text text-transparent bg-gradient-to-r from-primary-800 to-primary-500 dark:from-white dark:to-gray-300">滴答：</span>
                <span class="text-accent-400">主人的任务</span>
              </h1>
              <p class="text-xs text-gray-400 dark:text-gray-500 tracking-wider uppercase mt-1">
                Master's Tasks & Time Management
              </p>
            </div>
          </div>

          <DropdownMenuRoot>
            <DropdownMenuTrigger class="group flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-full hover:bg-white/80 dark:hover:bg-gray-800/80 hover:shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all focus:outline-none">
              <div class="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-primary-200 to-accent-200 dark:from-primary-800 dark:to-accent-900 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold text-base overflow-hidden shadow-inner ring-2 ring-white dark:ring-gray-800">
                <img v-if="user?.user_metadata?.picture" :src="user.user_metadata.picture" class="w-full h-full object-cover" />
                <span v-else>{{ user?.user_metadata?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U' }}</span>
              </div>
              <div class="text-left hidden md:block">
                <div class="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {{ displayName }}
                </div>
              </div>
              <Icon name="heroicons:chevron-down" class="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-all duration-200 group-data-[state=open]:rotate-180" />
            </DropdownMenuTrigger>

            <DropdownMenuPortal>
              <DropdownMenuContent
                class="w-56 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden z-50 origin-top-right ring-1 ring-black/5 p-1.5 data-[state=open]:animate-slide-in-from-top data-[state=closed]:animate-slide-out-to-top"
                :side-offset="12"
                align="end"
              >
                <div class="px-3 py-2 md:hidden">
                  <div class="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    当前用户
                  </div>
                  <div class="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {{ user?.email }}
                  </div>
                </div>
                <DropdownMenuSeparator class="h-px bg-gray-100 dark:bg-gray-700/50 my-1 md:hidden" />

                <DropdownMenuItem
                  class="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg transition-all group cursor-pointer outline-none data-[highlighted]:bg-primary-50 dark:data-[highlighted]:bg-primary-900/30"
                  @select="() => openConfig()"
                >
                  <div class="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 text-gray-500 group-hover:text-primary-500 transition-colors">
                    <Icon name="heroicons:cog-6-tooth" class="w-4 h-4" />
                  </div>
                  系统配置
                </DropdownMenuItem>

                <DropdownMenuSeparator class="h-px bg-gray-100 dark:bg-gray-700/50 my-1" />

                <DropdownMenuItem
                  class="flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all group cursor-pointer outline-none data-[highlighted]:bg-red-50 dark:data-[highlighted]:bg-red-900/20"
                  @select="logout"
                >
                  <div class="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 group-hover:bg-red-100 dark:group-hover:bg-red-900/50 text-red-500 transition-colors">
                    <Icon name="heroicons:arrow-right-on-rectangle" class="w-4 h-4" />
                  </div>
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenuRoot>
        </div>

        <!-- Greeting + Section header -->
        <div class="mb-8">
          <p class="text-lg text-gray-500 dark:text-gray-400 font-medium">
            {{ greeting }}，<span class="text-gray-800 dark:text-gray-200">{{ displayName }}</span>
          </p>
          <h2 class="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-4">
            <Icon name="heroicons:squares-2x2" class="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
            功能中心
          </h2>
        </div>

        <!-- Function Center (Actions) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <DailyNoteAction @configure="openConfig" @schedule="openConfig('schedule')" />
          <WeeklyReportAction @configure="openConfig" @schedule="openConfig('schedule')" />
          <TextToCalAction @configure="openConfig" />
          <ImageToCalAction @configure="openConfig" />
          <TemplateCalAction @configure="openConfig" />
        </div>

        <!-- Config Modal -->
        <Modal
          v-model="showConfigModal"
          title="系统配置"
          max-width="max-w-5xl"
          :show-header="false"
          :padding="false"
        >
          <ConfigSection :initial-tab="configInitialTab" @close="showConfigModal = false" />
        </Modal>
      </div>

      <!-- Footer -->
      <div class="border-t border-gray-100 dark:border-gray-800 py-6 text-center">
        <p class="text-xs text-gray-400 dark:text-gray-600">
          滴答：主人的任务 &middot; Powered by AI
        </p>
      </div>
    </ClientOnly>
  </div>
</template>
