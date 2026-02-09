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
</script>

<template>
  <div class="min-h-screen p-4 md:p-8 transition-colors duration-300 bg-gray-50 dark:bg-gray-900">
    <ClientOnly>
      <div class="max-w-5xl mx-auto">
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-center mb-12 px-4 md:px-2 mt-8 relative z-40">
          <div class="mb-6 md:mb-0 relative group flex flex-col md:flex-row items-center gap-4 md:gap-6">
            <div class="w-10 h-10 flex-shrink-0 transition-transform duration-500 hover:scale-110 hover:rotate-3">
              <Logo class="w-full h-full drop-shadow-2xl" />
            </div>
            <div class="text-center md:text-left">
              <h1 class="text-2xl md:text-2xl font-black text-[#203255] dark:text-white tracking-tight leading-tight">
                <span class="bg-clip-text text-transparent bg-gradient-to-r from-[#203255] to-[#4a5d85] dark:from-white dark:to-gray-300">滴答：</span>
                <span class="text-[#f8867a]">主人的任务</span>
              </h1>
              <p class="text-xs text-gray-400/90 dark:text-gray-500 tracking-wider uppercase mt-1 ml-0.5">
                Master's Tasks & Time Management
              </p>
            </div>
          </div>

          <DropdownMenuRoot>
            <DropdownMenuTrigger class="group flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-full hover:bg-white/80 dark:hover:bg-gray-800/80 hover:shadow-sm border border-transparent hover:border-gray-100 dark:hover:border-gray-700 transition-all focus:outline-none">
              <div class="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900 dark:to-accent-900 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-lg overflow-hidden shadow-inner ring-2 ring-white dark:ring-gray-900">
                <img v-if="user?.user_metadata?.picture" :src="user.user_metadata.picture" class="w-full h-full object-cover" />
                <span v-else>{{ user?.user_metadata?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U' }}</span>
              </div>
              <div class="text-left hidden md:block">
                <div class="text-sm font-bold text-gray-800 dark:text-gray-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {{ user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] }}
                </div>
              </div>
              <Icon name="heroicons:chevron-down" class="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors group-data-[state=open]:rotate-180" />
            </DropdownMenuTrigger>

            <DropdownMenuPortal>
              <DropdownMenuContent
                class="w-56 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-100/50 dark:border-gray-700/50 overflow-hidden z-[100] animate-fade-in origin-top-right ring-1 ring-black/5 p-2"
                :side-offset="12"
                align="end"
              >
                <div class="px-3 py-2 md:hidden">
                  <div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Signed in as
                  </div>
                  <div class="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {{ user?.email }}
                  </div>
                </div>
                <DropdownMenuSeparator class="h-px bg-gray-100 dark:bg-gray-700/50 my-1 md:hidden" />

                <DropdownMenuItem
                  class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400 rounded-xl transition-all group cursor-pointer outline-none data-[highlighted]:bg-primary-50 dark:data-[highlighted]:bg-primary-900/30"
                  @select="() => openConfig()"
                >
                  <div class="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 group-hover:bg-white dark:group-hover:bg-gray-800 text-gray-500 group-hover:text-primary-500 transition-colors">
                    <Icon name="heroicons:cog-6-tooth" class="w-4 h-4" />
                  </div>
                  系统配置
                </DropdownMenuItem>

                <DropdownMenuSeparator class="h-px bg-gray-100 dark:bg-gray-700/50 my-1" />

                <DropdownMenuItem
                  class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all group cursor-pointer outline-none data-[highlighted]:bg-red-50 dark:data-[highlighted]:bg-red-900/20"
                  @select="logout"
                >
                  <div class="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 group-hover:bg-white dark:group-hover:bg-gray-800 text-red-500 transition-colors">
                    <Icon name="heroicons:arrow-right-on-rectangle" class="w-4 h-4" />
                  </div>
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenuRoot>
        </div>

        <!-- Function Center (Actions) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
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
    </ClientOnly>
  </div>
</template>
