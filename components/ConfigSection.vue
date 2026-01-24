<script setup lang="ts">
import { Icon } from '@iconify/vue'
import DidaConfig from './Config/DidaConfig.vue'
import CalendarConfig from './Config/CalendarConfig.vue'
import LLMConfig from './Config/LLMConfig.vue'
import ConfigPersonalization from './Config/PersonalizationConfig.vue'

import ApiKeyManager from './Config/ApiKeyManager.vue'

const { load, save, fetched, loading, error } = useUserConfig()
const toast = useToast()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const saving = ref(false)

async function handleSave() {
  saving.value = true
  try {
    await save()
    toast.add({ title: '配置已保存', color: 'success' })
  } catch (e: any) {
    toast.add({ title: '保存失败', description: e.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

const activeTab = ref('personalization')

const tabs = [
  { id: 'personalization', label: '个性化', icon: 'heroicons:user' },
  { id: 'dida', label: '滴答清单', icon: 'heroicons:check-circle' },
  { id: 'calendar', label: '日历', icon: 'heroicons:calendar' },
  { id: 'llm', label: 'AI 模型', icon: 'heroicons:sparkles' },
  { id: 'api_key', label: 'API 凭证', icon: 'heroicons:key' }
]
</script>

<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div v-if="loading && !fetched" class="flex flex-col items-center justify-center py-20 animate-fade-in">
      <div class="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-full mb-4">
        <Icon icon="line-md:loading-twotone-loop" class="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
      </div>
      <p class="text-gray-500 dark:text-gray-400 font-medium">正在加载配置信息...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex flex-col items-center justify-center py-20 animate-fade-in">
       <div class="p-4 bg-red-50 dark:bg-red-900/20 rounded-full mb-4">
         <Icon icon="heroicons:exclamation-triangle" class="w-8 h-8 text-red-500" />
       </div>
       <p class="text-gray-900 dark:text-white font-medium text-lg">加载配置失败</p>
       <p class="text-gray-500 dark:text-gray-400 mt-2 mb-6 max-w-md text-center">{{ error }}</p>
       <button 
         @click="load(true)" 
         class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
       >
         <Icon icon="heroicons:arrow-path" class="w-4 h-4" />
         重试
       </button>
    </div>

    <div v-else class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden animate-fade-in flex flex-col h-[600px] md:flex-row">
      
      <!-- Sidebar Tabs -->
      <div class="w-full md:w-64 bg-gray-50 dark:bg-gray-900/50 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-700 flex md:flex-col">
        <div class="p-6 hidden md:block">
           <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Icon icon="heroicons:adjustments-horizontal" class="w-5 h-5 text-gray-400" />
            系统配置
          </h3>
        </div>
        
        <div class="flex-1 overflow-x-auto md:overflow-x-visible flex md:flex-col p-2 md:p-4 gap-1">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
            ]"
          >
            <Icon :icon="tab.icon" class="w-5 h-5" />
            {{ tab.label }}
          </button>
        </div>
      </div>

      <!-- Content Area -->
      <div class="flex-1 flex flex-col min-h-0">
        <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800">
           <h2 class="text-xl font-bold text-gray-900 dark:text-white">
             {{ tabs.find(t => t.id === activeTab)?.label }}
           </h2>
           <div class="flex items-center gap-2">
             <button 
              @click="handleSave" 
              :disabled="saving"
              class="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon v-if="saving" icon="line-md:loading-twotone-loop" class="w-4 h-4" />
              <Icon v-else icon="heroicons:check" class="w-4 h-4" />
              保存
            </button>
            <button 
              @click="emit('close')"
              class="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/60 transition-colors"
            >
              <Icon icon="heroicons:x-mark" class="w-5 h-5" />
            </button>
           </div>
        </div>

        <div class="flex-1 overflow-y-auto p-6 md:p-8">
          <div v-show="activeTab === 'personalization'" class="animate-fade-in">
            <ConfigPersonalization />
          </div>
          <div v-show="activeTab === 'dida'" class="animate-fade-in">
             <DidaConfig />
          </div>
          <div v-show="activeTab === 'calendar'" class="animate-fade-in">
             <CalendarConfig />
          </div>
          <div v-show="activeTab === 'llm'" class="animate-fade-in">
             <LLMConfig />
          </div>
          <div v-show="activeTab === 'api_key'" class="animate-fade-in">
             <ApiKeyManager />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
