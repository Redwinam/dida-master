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

// Eagerly load config when this component mounts, if not already fetched
onMounted(() => {
  if (!fetched.value && !loading.value) {
    load()
  }
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
  { id: 'dida', label: '滴答清单', icon: 'lucide:circle-check' },
  { id: 'calendar', label: '日历', icon: 'lucide:calendar' },
  { id: 'llm', label: 'AI 模型', icon: 'lucide:sparkles' },
  { id: 'api_key', label: 'API 凭证', icon: 'lucide:key-round' },
  { id: 'personalization', label: '个性化', icon: 'lucide:user' },
  { id: 'schedule', label: '定时任务', icon: 'lucide:clock' },
]
</script>

<template>
  <!-- Fixed-size container prevents height jumping between states -->
  <div class="config-section-root">
    <!-- Loading State -->
    <div v-if="loading && !fetched" class="config-state-placeholder animate-content-in">
      <div class="config-loader">
        <div class="config-loader-ring">
          <div class="config-loader-ring-inner" />
        </div>
        <div class="config-loader-dot" />
      </div>
      <p class="text-sm text-gray-400 dark:text-gray-500 font-medium mt-5 tracking-wide">
        加载配置中
      </p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="config-state-placeholder animate-content-in">
      <div class="p-4 bg-red-50 dark:bg-red-900/20 rounded-full mb-4">
        <Icon name="lucide:triangle-alert" class="w-8 h-8 text-red-500" />
      </div>
      <p class="text-gray-900 dark:text-white font-medium text-lg">
        加载配置失败
      </p>
      <p class="text-gray-500 dark:text-gray-400 mt-2 mb-6 max-w-md text-center text-sm">
        {{ error }}
      </p>
      <button
        class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
        @click="load(true)"
      >
        <Icon name="lucide:refresh-cw" class="w-4 h-4" />
        重试
      </button>
    </div>

    <TabsRoot
      v-else
      v-model="activeTab"
      class="bg-transparent rounded-none shadow-none border-0 overflow-hidden animate-content-in flex flex-col h-full md:flex-row"
    >
      <!-- Sidebar Tabs -->
      <div class="w-full md:w-56 bg-gray-50 dark:bg-gray-900/50 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-700 flex md:flex-col shrink-0">
        <div class="p-5 hidden md:block">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Icon name="lucide:sliders-horizontal" class="w-5 h-5 text-gray-400" />
            系统配置
          </h3>
        </div>

        <TabsList class="flex-1 overflow-x-auto md:overflow-x-visible flex flex-nowrap md:flex-col p-2 md:px-3 md:pb-4 gap-0.5">
          <TabsTrigger
            v-for="tab in tabs"
            :key="tab.id"
            :value="tab.id"
            :class="[
              'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap',
              'data-[state=active]:bg-white data-[state=active]:dark:bg-gray-800 data-[state=active]:text-primary-600 data-[state=active]:dark:text-primary-400 data-[state=active]:shadow-sm',
              'data-[state=inactive]:text-gray-600 data-[state=inactive]:dark:text-gray-400 data-[state=inactive]:hover:bg-gray-100 data-[state=inactive]:dark:hover:bg-gray-800 data-[state=inactive]:hover:text-gray-900 data-[state=inactive]:dark:hover:text-gray-200',
            ]"
          >
            <Icon :name="tab.icon" class="w-4.5 h-4.5" />
            {{ tab.label }}
          </TabsTrigger>
        </TabsList>
      </div>

      <!-- Content Area -->
      <div class="flex-1 flex flex-col min-h-0">
        <div class="p-4 md:px-6 md:py-4 flex justify-between items-center bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">
            {{ tabs.find(t => t.id === activeTab)?.label }}
          </h2>
          <div class="flex items-center gap-2">
            <button
              :disabled="saving"
              class="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              @click="handleSave"
            >
              <Icon v-if="saving" name="line-md:loading-twotone-loop" class="w-4 h-4" />
              <Icon v-else name="lucide:check" class="w-4 h-4" />
              保存
            </button>
            <button
              class="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/60 transition-colors"
              @click="emit('close')"
            >
              <Icon name="lucide:x" class="w-5 h-5" />
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

<style scoped>
/* Fixed dimensions to prevent height jumping */
.config-section-root {
  height: min(80vh, 640px);
  display: flex;
  flex-direction: column;
}

/* Centering container for loading & error states */
.config-state-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* ── Beautiful Orbital Loader ── */
.config-loader {
  position: relative;
  width: 52px;
  height: 52px;
}

.config-loader-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2.5px solid transparent;
  border-top-color: var(--color-primary-500);
  border-right-color: var(--color-primary-300);
  animation: config-spin 1.1s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
}

.config-loader-ring-inner {
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  border: 2px solid transparent;
  border-bottom-color: var(--color-accent-400);
  border-left-color: var(--color-accent-300);
  animation: config-spin-reverse 0.85s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
}

.config-loader-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 7px;
  height: 7px;
  margin: -3.5px 0 0 -3.5px;
  border-radius: 50%;
  background: var(--color-primary-500);
  animation: config-pulse 1.1s ease-in-out infinite;
}

@keyframes config-spin {
  to { transform: rotate(360deg); }
}

@keyframes config-spin-reverse {
  to { transform: rotate(-360deg); }
}

@keyframes config-pulse {
  0%, 100% {
    opacity: 0.4;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.15);
  }
}
</style>
