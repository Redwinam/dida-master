<script setup lang="ts">
import { Icon } from '@iconify/vue'

const { config } = useUserConfig()

const mbtiGroups = [
  {
    name: 'Analysts',
    label: '分析家 (Analysts)',
    color: 'purple',
    types: ['INTJ', 'INTP', 'ENTJ', 'ENTP'],
  },
  {
    name: 'Diplomats',
    label: '外交家 (Diplomats)',
    color: 'green',
    types: ['INFJ', 'INFP', 'ENFJ', 'ENFP'],
  },
  {
    name: 'Sentinels',
    label: '守护者 (Sentinels)',
    color: 'blue',
    types: ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'],
  },
  {
    name: 'Explorers',
    label: '探险家 (Explorers)',
    color: 'yellow',
    types: ['ISTP', 'ISFP', 'ESTP', 'ESFP'],
  },
]

const lastMbti = ref('')

const enabled = computed({
  get: () => !!config.value.mbti,
  set: val => {
    if (!val) {
      if (config.value.mbti) lastMbti.value = config.value.mbti
      config.value.mbti = ''
    }
    else {
      if (lastMbti.value) config.value.mbti = lastMbti.value
    }
  },
})

// Helper to get color classes based on group color
const getColorClasses = (color: string, isSelected: boolean) => {
  const colors: Record<string, string> = {
    purple: isSelected
      ? 'bg-purple-600 text-white border-purple-600 shadow-purple-500/30 ring-2 ring-purple-600 ring-offset-2 dark:ring-offset-gray-900'
      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20',
    green: isSelected
      ? 'bg-green-600 text-white border-green-600 shadow-green-500/30 ring-2 ring-green-600 ring-offset-2 dark:ring-offset-gray-900'
      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20',
    blue: isSelected
      ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/30 ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-gray-900'
      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20',
    yellow: isSelected
      ? 'bg-amber-500 text-white border-amber-500 shadow-amber-500/30 ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-gray-900'
      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-amber-400 dark:hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20',
  }
  return colors[color]
}

const selectType = (type: string) => {
  config.value.mbti = type
}
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            MBTI 人格类型偏好
          </label>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            开启后，AI 将根据您的人格类型调整每日计划和周报的建议风格。
          </p>
        </div>

        <!-- Toggle Switch -->
        <button
          type="button"
          class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          :class="[enabled ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700']"
          role="switch"
          :aria-checked="enabled"
          @click="enabled = !enabled"
        >
          <span
            aria-hidden="true"
            class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
            :class="[enabled ? 'translate-x-5' : 'translate-x-0']"
          ></span>
        </button>
      </div>

      <div v-if="enabled" class="grid grid-cols-1 gap-6 pt-4 animate-in fade-in slide-in-from-top-4 duration-300">
        <div v-for="group in mbtiGroups" :key="group.name" class="space-y-3">
          <h3 class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <span
              class="w-2.5 h-2.5 rounded-full shadow-sm"
              :class="{
                'bg-purple-500': group.color === 'purple',
                'bg-green-500': group.color === 'green',
                'bg-blue-500': group.color === 'blue',
                'bg-amber-500': group.color === 'yellow',
              }"
            ></span>
            {{ group.label }}
          </h3>
          <div class="grid grid-cols-4 gap-3 sm:gap-4">
            <button
              v-for="type in group.types"
              :key="type"
              type="button"
              class="relative flex items-center justify-center py-2.5 px-2 text-sm font-bold rounded-xl border shadow-sm transition-all duration-200 focus:outline-none"
              :class="getColorClasses(group.color, config.mbti === type)"
              @click="selectType(type)"
            >
              {{ type }}
              <Icon
                v-if="config.mbti === type"
                icon="heroicons:check-circle-solid"
                class="absolute -top-2 -right-2 w-5 h-5 text-white bg-inherit rounded-full"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
