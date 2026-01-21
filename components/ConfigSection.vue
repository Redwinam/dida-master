<script setup lang="ts">
import { Icon } from '@iconify/vue'
import DidaConfig from './Config/DidaConfig.vue'
import CalendarConfig from './Config/CalendarConfig.vue'
import LLMConfig from './Config/LLMConfig.vue'
import ConfigPersonalization from './Config/PersonalizationConfig.vue'

const { load, save, fetched, loading, error } = useUserConfig()
const toast = useToast()

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

// Initial load is handled in index.vue or here?
// Better to handle here if it's the main config view.
// But index.vue handles auth-dependent loading.
// We can just watch `fetched` or rely on parent to trigger load if not fetched.
// But index.vue has complex logic for token handling etc.
// Let's assume index.vue handles the initial load trigger, or we check it here.
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

    <div v-else class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden animate-fade-in">
      <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Icon icon="heroicons:adjustments-horizontal" class="w-5 h-5 text-gray-400" />
          全局配置
        </h3>
        <button 
          @click="handleSave" 
          :disabled="saving"
          class="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon v-if="saving" icon="line-md:loading-twotone-loop" class="w-4 h-4" />
          <Icon v-else icon="heroicons:check" class="w-4 h-4" />
          保存所有更改
        </button>
      </div>

      <div class="p-6 md:p-8">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Left Column: TickTick & Calendar -->
            <div class="space-y-8">
                <DidaConfig />
                <CalendarConfig />
            </div>

            <!-- Right Column: LLM & Auth -->
            <div class="space-y-8 lg:border-l lg:border-gray-100 lg:dark:border-gray-700 lg:pl-8">
                <!-- Personalization Config -->
                <ConfigPersonalization />
                <LLMConfig />
            </div>
        </div>
      </div>
    </div>
  </div>
</template>
