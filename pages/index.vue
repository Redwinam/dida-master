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
  <div class="min-h-screen transition-colors duration-300 relative overflow-hidden">
    <!-- Background decorative orbs -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <div class="page-orb page-orb-1" />
      <div class="page-orb page-orb-2" />
      <div class="page-orb page-orb-3" />
    </div>

    <ClientOnly>
      <!-- Hero Section -->
      <div class="relative z-10">
        <div class="bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 overflow-hidden">
          <!-- Hero inner orbs -->
          <div class="absolute inset-0 overflow-hidden pointer-events-none">
            <div class="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-accent-400/[0.08] blur-3xl" />
            <div class="absolute -bottom-10 -left-10 w-60 h-60 rounded-full bg-primary-400/[0.1] blur-3xl" />
          </div>
          <!-- Subtle grid -->
          <div class="absolute inset-0 opacity-[0.03] pointer-events-none" style="background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0); background-size: 40px 40px;" />

          <div class="max-w-5xl mx-auto px-4 md:px-8 relative z-10">
            <div class="flex flex-col md:flex-row justify-between items-center py-10 md:py-14">
              <!-- Brand -->
              <div class="mb-6 md:mb-0 flex flex-col md:flex-row items-center gap-4 md:gap-5 animate-content-in">
                <div class="w-12 h-12 flex-shrink-0 p-2 rounded-xl bg-white/[0.1] backdrop-blur-sm border border-white/[0.1] shadow-lg transition-transform duration-500 hover:scale-110 hover:rotate-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1389.8 1135.4" class="w-full h-full drop-shadow-lg">
                    <path fill="white" d="M1363.4,653.8c-27.2,38.8-71.9,63.4-119.4,63.4h-718.6c-69.3,0-129.3-49.9-143.4-116.9-5.6-26.5-4.5-52.9,3.5-78,20.2-63.9,78.6-104.3,145.1-104.3l715.2.3c67,0,127.5,51.6,140.5,117.5,8,40.5,1.5,83.3-22.7,117.9h-.2Z" />
                    <path fill="white" d="M1303.6,285.8c-18.3,8.1-38.4,13.4-58.5,13.4l-715.8.4c-53.3,0-101.8-25.9-129.4-71.7-19-31.5-25.7-68.3-18.9-106.1C392.4,58.5,449.7,1.5,517.2,1.4l732.5-.2c71.5,0,129.9,59.8,138.4,128,4.9,39-3.6,77.3-26.3,108.5-15.2,21-34,37.3-58.3,48.1h0Z" />
                    <path fill="white" d="M1382.6,1033.7c-18,58.2-73.3,101.3-134.9,101.3l-723.5.4c-33.4,0-64.8-11.7-90.4-32.1-34.2-27.2-53-65.6-55.4-109.6-4.4-79.4,57.4-155.6,140.1-155.7l730.4-.9c29.9,0,57.9,11.7,81.3,28.7,51.8,37.8,71.5,106.1,52.4,167.8h0Z" />
                    <circle fill="#f8867a" cx="149.8" cy="149.8" r="149.8" />
                  </svg>
                </div>
                <div class="text-center md:text-left">
                  <h1 class="text-2xl font-black tracking-tight leading-tight">
                    <span class="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">滴答：</span>
                    <span class="text-accent-400">主人的任务</span>
                  </h1>
                  <p class="text-primary-300/60 text-xs tracking-wider uppercase mt-1">
                    Master's Tasks & Time Management
                  </p>
                </div>
              </div>

              <!-- User Menu -->
              <DropdownMenuRoot>
                <DropdownMenuTrigger class="group flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] hover:border-white/[0.2] backdrop-blur-sm transition-all focus:outline-none animate-content-in">
                  <div class="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-primary-400/30 to-accent-400/30 flex items-center justify-center text-white font-bold text-lg overflow-hidden shadow-inner ring-2 ring-white/20">
                    <img v-if="user?.user_metadata?.picture" :src="user.user_metadata.picture" class="w-full h-full object-cover" />
                    <span v-else class="text-sm">{{ user?.user_metadata?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U' }}</span>
                  </div>
                  <div class="text-left hidden md:block">
                    <div class="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">
                      {{ user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] }}
                    </div>
                  </div>
                  <Icon name="lucide:chevron-down" class="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors group-data-[state=open]:rotate-180" />
                </DropdownMenuTrigger>

                <DropdownMenuPortal>
                  <DropdownMenuContent
                    class="w-56 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-100/50 dark:border-gray-700/50 overflow-hidden z-50 origin-top-right ring-1 ring-black/5 p-2 data-[state=open]:animate-slide-in-from-top data-[state=closed]:animate-slide-out-to-top"
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
                        <Icon name="lucide:settings" class="w-4 h-4" />
                      </div>
                      系统配置
                    </DropdownMenuItem>

                    <DropdownMenuSeparator class="h-px bg-gray-100 dark:bg-gray-700/50 my-1" />

                    <DropdownMenuItem
                      class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all group cursor-pointer outline-none data-[highlighted]:bg-red-50 dark:data-[highlighted]:bg-red-900/20"
                      @select="logout"
                    >
                      <div class="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 group-hover:bg-white dark:group-hover:bg-gray-800 text-red-500 transition-colors">
                        <Icon name="lucide:log-out" class="w-4 h-4" />
                      </div>
                      退出登录
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenuPortal>
              </DropdownMenuRoot>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="relative z-10 max-w-5xl mx-auto px-4 md:px-8 -mt-6 pb-16">
        <!-- Function Center (Actions) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5 card-stagger">
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
      <div class="relative z-10 border-t border-gray-100 dark:border-gray-800 py-6">
        <div class="max-w-5xl mx-auto px-4 md:px-8 flex items-center justify-center gap-3">
          <Logo class="w-5 h-5 text-gray-300 dark:text-gray-600" />
          <span class="text-xs text-gray-400 dark:text-gray-600">
            © {{ new Date().getFullYear() }} 滴答：主人的任务
          </span>
        </div>
      </div>
    </ClientOnly>
  </div>
</template>
