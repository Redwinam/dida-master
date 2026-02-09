<script setup lang="ts">
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import DidaConfig from './Config/DidaConfig.vue'
import CalendarConfig from './Config/CalendarConfig.vue'
import LLMConfig from './Config/LLMConfig.vue'
import ConfigPersonalization from './Config/PersonalizationConfig.vue'

import ApiKeyManager from './Config/ApiKeyManager.vue'
import ScheduleConfig from './Config/ScheduleConfig.vue'

const props = defineProps<{
  initialTab?: string
}>()

const { load, save, fetched, loading, error } = useUserConfig()
const toast = useToast()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const saving = ref(false)

const llmConfigRef = ref<InstanceType<typeof LLMConfig> | null>(null)

const activeTab = ref(props.initialTab || 'dida')

watch(() => props.initialTab, val => {
  if (val) activeTab.value = val
})

async function handleSave() {
  saving.value = true
  try {
    if (activeTab.value === 'llm') {
      await llmConfigRef.value?.saveMappings()
      toast.add({ title: '映射已保存', color: 'success' })
      return
    }
    await save()
    toast.add({ title: '配置已保存', color: 'success' })
  }
  catch (e: any) {
    toast.add({ title: '保存失败', description: e.message, color: 'error' })
  }
  finally {
    saving.value = false
  }
}

const tabs = [
  { id: 'dida', label: '滴答清单', icon: 'heroicons:check-circle' },
  { id: 'calendar', label: '日历', icon: 'heroicons:calendar' },
  { id: 'llm', label: 'AI 模型', icon: 'heroicons:sparkles' },
  { id: 'api_key', label: 'API 凭证', icon: 'heroicons:key' },
  { id: 'personalization', label: '个性化', icon: 'heroicons:user' },
  { id: 'schedule', label: '定时任务', icon: 'heroicons:clock' },
]
</script>

<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div v-if="loading && !fetched" class="flex flex-col items-center justify-center py-20 animate-content-in">
      <div class="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-full mb-4">
        <Icon name="line-md:loading-twotone-loop" class="w-8 h-8 text-primary-600 dark:text-primary-400" />
      </div>
      <p class="text-gray-500 dark:text-gray-400 font-medium">
        正在加载配置信息...
      </p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex flex-col items-center justify-center py-20 animate-content-in">
      <div class="p-4 bg-red-50 dark:bg-red-900/20 rounded-full mb-4">
        <Icon name="heroicons:exclamation-triangle" class="w-8 h-8 text-red-500" />
      </div>
      <p class="text-gray-900 dark:text-white font-medium text-lg">
        加载配置失败
      </p>
      <p class="text-gray-500 dark:text-gray-400 mt-2 mb-6 max-w-md text-center">
        {{ error }}
      </p>
      <button
        class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
        @click="load(true)"
      >
        <Icon name="heroicons:arrow-path" class="w-4 h-4" />
        重试
      </button>
    </div>

    <TabsRoot
      v-else
      v-model="activeTab"
      class="bg-transparent rounded-none shadow-none border-0 overflow-hidden animate-content-in flex flex-col max-h-[80vh] md:flex-row"
    >
      <!-- Sidebar Tabs -->
      <div class="w-full md:w-56 bg-gray-50 dark:bg-gray-900/50 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-700 flex md:flex-col shrink-0">
        <div class="p-5 hidden md:block">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Icon name="heroicons:adjustments-horizontal" class="w-5 h-5 text-gray-400" />
            系统配置
          </h3>
        </div>

        <TabsList class="flex-1 overflow-x-auto md:overflow-x-visible flex flex-nowrap md:flex-col p-2 md:px-3 md:pb-4 gap-0.5">
          <TabsTrigger
            v-for="tab in tabs"
            :key="tab.id"
            :value="tab.id"
            :class="[
              'relative flex items-center gap-2.5 px-3 md:px-4 py-2 md:py-2.5 rounded-full md:rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap',
              'data-[state=active]:bg-white data-[state=active]:dark:bg-gray-800 data-[state=active]:text-primary-600 data-[state=active]:dark:text-primary-400 data-[state=active]:shadow-sm',
              'data-[state=inactive]:text-gray-500 data-[state=inactive]:dark:text-gray-400 data-[state=inactive]:hover:bg-gray-100 data-[state=inactive]:dark:hover:bg-gray-800 data-[state=inactive]:hover:text-gray-800 data-[state=inactive]:dark:hover:text-gray-200',
            ]"
          >
            <!-- Active indicator bar (desktop) -->
            <span class="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-primary-500 transition-opacity duration-200 data-[state=inactive]:opacity-0" :data-state="activeTab === tab.id ? 'active' : 'inactive'"></span>
            <Icon :name="tab.icon" class="w-4 h-4" />
            {{ tab.label }}
          </TabsTrigger>
        </TabsList>
      </div>

      <!-- Content Area -->
      <div class="flex-1 flex flex-col min-h-0">
        <div class="p-4 md:px-6 md:py-4 flex justify-between items-center bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Icon :name="tabs.find(t => t.id === activeTab)?.icon || 'heroicons:cog-6-tooth'" class="w-5 h-5 text-primary-500" />
            {{ tabs.find(t => t.id === activeTab)?.label }}
          </h2>
          <div class="flex items-center gap-2">
            <button
              :disabled="saving"
              class="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 hover:shadow-md text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              @click="handleSave"
            >
              <Icon v-if="saving" name="line-md:loading-twotone-loop" class="w-4 h-4" />
              <Icon v-else name="heroicons:check" class="w-4 h-4" />
              保存
            </button>
            <button
              class="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-200 dark:hover:bg-gray-700/60 transition-colors"
              @click="emit('close')"
            >
              <Icon name="heroicons:x-mark" class="w-5 h-5" />
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <TabsContent value="dida" class="animate-content-in outline-none">
            <DidaConfig />
          </TabsContent>
          <TabsContent value="calendar" class="animate-content-in outline-none">
            <CalendarConfig />
          </TabsContent>
          <TabsContent value="llm" class="animate-content-in outline-none">
            <LLMConfig ref="llmConfigRef" />
          </TabsContent>
          <TabsContent value="api_key" class="animate-content-in outline-none">
            <ApiKeyManager />
          </TabsContent>
          <TabsContent value="personalization" class="animate-content-in outline-none">
            <ConfigPersonalization />
          </TabsContent>
          <TabsContent value="schedule" class="animate-content-in outline-none">
            <ScheduleConfig />
          </TabsContent>
        </div>
      </div>
    </TabsRoot>
  </div>
</template>
