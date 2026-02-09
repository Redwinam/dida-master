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
    const tokenFromQuery = route.query.dida_token as string
    await load()

    if (tokenFromQuery) {
      config.value.dida_token = tokenFromQuery
      await save()
      router.replace({ query: { ...route.query, dida_token: undefined } })
      showConfigModal.value = true
    }
  }
}, { immediate: true })

onMounted(() => {
  setTimeout(() => {
    if (config.value.dida_token === '' && !fetched.value && !useUserConfig().loading.value) {
      load()
    }
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
</script>

<template>
  <div class="min-h-screen transition-colors duration-300 bg-gradient-to-br from-gray-50 via-primary-50/20 to-accent-50/10 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
    <ClientOnly>
      <div class="max-w-5xl mx-auto px-4 md:px-8 pb-16">
        <!-- Header bar -->
        <header class="flex items-center justify-between py-5 md:py-6">
          <!-- Left: Logo + Title -->
          <NuxtLink to="/" class="flex items-center gap-3">
            <div class="w-9 h-9 flex-shrink-0">
              <Logo class="w-full h-full" />
            </div>
            <span class="text-lg font-bold tracking-tight text-primary-900 dark:text-white">
              滴答<span class="text-accent-400">:</span> 主人的任务
            </span>
          </NuxtLink>

          <!-- Right: User dropdown -->
          <DropdownMenuRoot>
            <DropdownMenuTrigger class="group flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-full bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/80 dark:border-gray-700/60 shadow-sm hover:shadow-md hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all focus:outline-none">
              <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary-300 to-accent-300 dark:from-primary-700 dark:to-accent-800 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                <img v-if="user?.user_metadata?.picture" :src="user.user_metadata.picture" class="w-full h-full object-cover" />
                <span v-else>{{ user?.user_metadata?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U' }}</span>
              </div>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300 hidden md:block max-w-[120px] truncate">{{ displayName }}</span>
              <Icon name="heroicons:chevron-down" class="w-3.5 h-3.5 text-gray-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </DropdownMenuTrigger>

            <DropdownMenuPortal>
              <DropdownMenuContent
                class="w-52 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 z-50 origin-top-right p-1 data-[state=open]:animate-slide-in-from-top data-[state=closed]:animate-slide-out-to-top"
                :side-offset="8"
                align="end"
              >
                <div class="px-3 py-2 md:hidden">
                  <div class="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">当前用户</div>
                  <div class="text-sm font-bold text-gray-900 dark:text-white truncate">{{ user?.email }}</div>
                </div>
                <DropdownMenuSeparator class="h-px bg-gray-100 dark:bg-gray-700/50 my-1 md:hidden" />

                <DropdownMenuItem
                  class="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60 rounded-lg transition-colors cursor-pointer outline-none data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-700/60"
                  @select="() => openConfig()"
                >
                  <Icon name="heroicons:cog-6-tooth" class="w-4 h-4 text-gray-400" />
                  系统配置
                </DropdownMenuItem>

                <DropdownMenuSeparator class="h-px bg-gray-100 dark:bg-gray-700/50 my-1" />

                <DropdownMenuItem
                  class="flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer outline-none data-[highlighted]:bg-red-50 dark:data-[highlighted]:bg-red-900/20"
                  @select="logout"
                >
                  <Icon name="heroicons:arrow-right-on-rectangle" class="w-4 h-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenuRoot>
        </header>

        <!-- Function Center -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
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
