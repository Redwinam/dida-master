<script setup lang="ts">
import UiSwitch from '@/components/ui/Switch.vue'

const { config } = useUserConfig()
const { user } = useSession()

const hasApiKey = computed(() => !!user.value?.user_metadata?.api_key)

const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'))

const weekdays = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 0, label: '周日' },
]

// Parse time string "HH:MM" into parts
const dailyHour = computed({
  get: () => (config.value.schedule_daily_time || '08:30').split(':')[0],
  set: (v: string) => {
    const min = (config.value.schedule_daily_time || '08:30').split(':')[1] || '30'
    config.value.schedule_daily_time = `${v}:${min}`
  },
})
const dailyMinute = computed({
  get: () => (config.value.schedule_daily_time || '08:30').split(':')[1] || '30',
  set: (v: string) => {
    const hr = (config.value.schedule_daily_time || '08:30').split(':')[0] || '08'
    config.value.schedule_daily_time = `${hr}:${v}`
  },
})

const weeklyHour = computed({
  get: () => (config.value.schedule_weekly_time || '09:00').split(':')[0],
  set: (v: string) => {
    const min = (config.value.schedule_weekly_time || '09:00').split(':')[1] || '00'
    config.value.schedule_weekly_time = `${v}:${min}`
  },
})
const weeklyMinute = computed({
  get: () => (config.value.schedule_weekly_time || '09:00').split(':')[1] || '00',
  set: (v: string) => {
    const hr = (config.value.schedule_weekly_time || '09:00').split(':')[0] || '09'
    config.value.schedule_weekly_time = `${hr}:${v}`
  },
})
</script>

<template>
  <div class="space-y-6">
    <!-- API Key Warning -->
    <div v-if="!hasApiKey" class="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
      <Icon name="lucide:triangle-alert" class="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
      <div>
        <p class="text-sm font-medium text-amber-800 dark:text-amber-300">
          需要先配置 API Key
        </p>
        <p class="text-xs text-amber-600 dark:text-amber-400 mt-1">
          定时任务依赖 API Key 进行身份验证。请先在「API 凭证」页面生成 API Key，然后再开启定时任务。
        </p>
      </div>
    </div>

    <!-- Info Banner -->
    <div class="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
      <Icon name="lucide:info" class="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
      <div>
        <p class="text-sm text-blue-700 dark:text-blue-300">
          定时任务将按照您设定的时间自动执行。为保证执行率和平台稳定性，实际执行时间可能有几分钟的偏差。
        </p>
      </div>
    </div>

    <!-- Daily Note Schedule -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <Icon name="lucide:sun" class="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">每日日程</span>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              自动生成当日 AI 日程安排
            </p>
          </div>
        </div>
        <UiSwitch v-model="config.schedule_daily_enabled" :disabled="!hasApiKey" />
      </div>

      <div v-if="config.schedule_daily_enabled" class="ml-12 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50 animate-content-in">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">执行时间</label>
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-500 dark:text-gray-400">每天</span>
          <select
            v-model="dailyHour"
            class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-20"
          >
            <option v-for="h in hours" :key="h" :value="h">
              {{ h }}
            </option>
          </select>
          <span class="text-lg font-bold text-gray-400">:</span>
          <select
            v-model="dailyMinute"
            class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-20"
          >
            <option v-for="m in minutes" :key="m" :value="m">
              {{ m }}
            </option>
          </select>
          <span class="text-xs text-gray-400 dark:text-gray-500 ml-2">{{ config.timezone || 'Asia/Shanghai' }}</span>
        </div>
      </div>
    </div>

    <hr class="border-gray-100 dark:border-gray-700" />

    <!-- Weekly Report Schedule -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
            <Icon name="lucide:file-chart-column-increasing" class="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">每周周报</span>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              自动生成本周工作周报
            </p>
          </div>
        </div>
        <UiSwitch v-model="config.schedule_weekly_enabled" :disabled="!hasApiKey" color="teal" />
      </div>

      <div v-if="config.schedule_weekly_enabled" class="ml-12 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50 animate-content-in space-y-4">
        <!-- Day of week -->
        <div>
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">执行日</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="day in weekdays"
              :key="day.value"
              :class="[
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border',
                config.schedule_weekly_day === day.value
                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                  : 'bg-white dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700',
              ]"
              @click="config.schedule_weekly_day = day.value"
            >
              {{ day.label }}
            </button>
          </div>
        </div>

        <!-- Time -->
        <div>
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">执行时间</label>
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-500 dark:text-gray-400">每{{ weekdays.find(d => d.value === config.schedule_weekly_day)?.label || '周一' }}</span>
            <select
              v-model="weeklyHour"
              class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 w-20"
            >
              <option v-for="h in hours" :key="h" :value="h">
                {{ h }}
              </option>
            </select>
            <span class="text-lg font-bold text-gray-400">:</span>
            <select
              v-model="weeklyMinute"
              class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 w-20"
            >
              <option v-for="m in minutes" :key="m" :value="m">
                {{ m }}
              </option>
            </select>
            <span class="text-xs text-gray-400 dark:text-gray-500 ml-2">{{ config.timezone || 'Asia/Shanghai' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
