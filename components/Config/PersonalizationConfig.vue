<script setup lang="ts">
import { Icon } from '@iconify/vue'

const { config } = useUserConfig()

const mbtiTypes = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP'
]
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          MBTI 人格类型
        </label>
        <div class="relative">
          <select 
            v-model="config.mbti" 
            class="appearance-none w-full pl-3 pr-10 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          >
            <option value="">未设置</option>
            <option v-for="type in mbtiTypes" :key="type" :value="type">
              {{ type }}
            </option>
          </select>
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <Icon icon="heroicons:chevron-down" class="w-4 h-4" />
          </div>
        </div>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          设置后，AI 将根据您的人格类型调整每日计划和周报的建议风格。
        </p>
      </div>
    </div>
  </div>
</template>
