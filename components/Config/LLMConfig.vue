<script setup lang="ts">
import { Icon } from '@iconify/vue'
import ApiKeyManager from './ApiKeyManager.vue'

const { config } = useUserConfig()
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-5">
      <h4 class="font-medium text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
        <Icon icon="heroicons:cpu-chip" class="w-5 h-5 text-purple-500" />
        大模型 (LLM)
      </h4>
      
      <!-- Text Model Section -->
      <div class="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
        <h5 class="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Icon icon="heroicons:chat-bubble-bottom-center-text" class="w-4 h-4 text-indigo-500" />
          Text Model (Daily Note & Text to Calendar)
        </h5>
        
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">API Key</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon icon="heroicons:lock-closed" class="w-5 h-5 text-gray-400" />
            </div>
            <input v-model="config.llm_api_key" type="password" class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">API URL</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon icon="heroicons:globe-alt" class="w-5 h-5 text-gray-400" />
            </div>
            <input v-model="config.llm_api_url" type="text" class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Model Name</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon icon="heroicons:cube" class="w-5 h-5 text-gray-400" />
            </div>
            <input v-model="config.llm_model" type="text" placeholder="e.g. deepseek-ai/DeepSeek-V3" class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
        </div>
      </div>

      <!-- Vision Model Section -->
      <div class="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
        <h5 class="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Icon icon="heroicons:photo" class="w-4 h-4 text-purple-500" />
          Vision Model (Image to Calendar)
        </h5>

        <div class="space-y-1.5">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
            API Key 
            <span class="text-xs font-normal text-gray-500">(Optional, defaults to Text API Key)</span>
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon icon="heroicons:lock-closed" class="w-5 h-5 text-gray-400" />
            </div>
            <input v-model="config.vision_api_key" type="password" placeholder="Same as Text Model" class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
            API URL
            <span class="text-xs font-normal text-gray-500">(Optional, defaults to Text API URL)</span>
          </label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon icon="heroicons:globe-alt" class="w-5 h-5 text-gray-400" />
            </div>
            <input v-model="config.vision_api_url" type="text" placeholder="Same as Text Model" class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Model Name</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon icon="heroicons:cube" class="w-5 h-5 text-gray-400" />
            </div>
            <input v-model="config.vision_model" type="text" placeholder="e.g. Qwen/Qwen2.5-VL-72B-Instruct" class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
        </div>
      </div>
    </div>

    <ApiKeyManager />
  </div>
</template>
