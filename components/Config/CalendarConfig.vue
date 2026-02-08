<script setup lang="ts">
import Modal from '@/components/ui/Modal.vue'

const { config } = useUserConfig()
const toast = useToast()
const { $supabase } = useNuxtApp()
const client = $supabase as any

const calendars = ref<any[]>([])
const fetchingCalendars = ref(false)
const showCalModal = ref(false)
const calProvider = ref('icloud')

// Initialize calProvider based on config
watch(() => config.value.cal_server_url, val => {
  if (val === 'https://caldav.icloud.com/') {
    calProvider.value = 'icloud'
  }
  else if (val) {
    calProvider.value = 'custom'
  }
}, { immediate: true })

// Update config when provider changes
watch(calProvider, val => {
  if (val === 'icloud') {
    config.value.cal_server_url = 'https://caldav.icloud.com/'
  }
  else {
    // If switching to custom, keep existing if not preset, or clear
    if (config.value.cal_server_url === 'https://caldav.icloud.com/') {
      config.value.cal_server_url = ''
    }
  }
})

async function fetchCalendars() {
  if (!config.value.cal_username || !config.value.cal_password || !config.value.cal_server_url) {
    toast.add({ title: '请先填写 CalDAV 账户信息', color: 'warning' })
    return
  }

  fetchingCalendars.value = true
  try {
    // Reuse client from composable context if possible, or get session
    const { data: { session } } = await client.auth.getSession()
    const headers: Record<string, string> = {}
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`

    const data: any = await $fetch('/api/cal/calendars', {
      params: {
        username: config.value.cal_username,
        password: config.value.cal_password,
        server_url: config.value.cal_server_url,
      },
      headers,
    })
    calendars.value = data || []
  }
  catch (e: any) {
    console.error('Failed to fetch calendars', e)
    toast.add({ title: '获取日历列表失败', description: e.message, color: 'error' })
  }
  finally {
    fetchingCalendars.value = false
  }
}

function openCalModal() {
  showCalModal.value = true
  fetchCalendars()
}

const targetCalendars = computed({
  get: () => {
    if (!config.value.calendar_target) return []
    return config.value.calendar_target.split(',').map(s => s.trim()).filter(Boolean)
  },
  set: val => {
    config.value.calendar_target = val.join(',')
  },
})

function toggleTargetCalendar(name: string) {
  const list = targetCalendars.value
  const index = list.indexOf(name)
  if (index === -1) {
    targetCalendars.value = [...list, name]
  }
  else {
    targetCalendars.value = list.filter(n => n !== name)
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">启用 CalDAV 日历同步</span>
      <label class="inline-flex items-center cursor-pointer">
        <input v-model="config.cal_enable" type="checkbox" class="sr-only peer" />
        <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
      </label>
    </div>

    <div v-if="config.cal_enable" class="grid grid-cols-1 gap-6 p-6 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50 animate-fade-in">
      <!-- Provider Selection -->
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">服务商 (Service Provider)</label>
        <div class="flex gap-4">
          <label class="inline-flex items-center">
            <input
              v-model="calProvider"
              type="radio"
              value="icloud"
              class="form-radio text-primary-600"
            />
            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">iCloud</span>
          </label>
          <label class="inline-flex items-center">
            <input
              v-model="calProvider"
              type="radio"
              value="custom"
              class="form-radio text-primary-600"
            />
            <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">其他 / 自定义 (CalDAV)</span>
          </label>
        </div>
      </div>

      <!-- Server URL (Custom only) -->
      <div v-if="calProvider === 'custom'" class="space-y-1.5 animate-fade-in">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">服务器地址 (Server URL)</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon name="heroicons:server" class="w-5 h-5 text-gray-400" />
          </div>
          <input
            v-model="config.cal_server_url"
            type="text"
            placeholder="https://caldav.example.com"
            class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ calProvider === 'icloud' ? 'Apple ID' : '邮箱地址' }}</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon name="heroicons:user-circle" class="w-5 h-5 text-gray-400" />
            </div>
            <input
              v-model="config.cal_username"
              type="text"
              :placeholder="calProvider === 'icloud' ? 'example@icloud.com' : 'example@icloud.com'"
              class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ calProvider === 'icloud' ? '应用专用密码' : '密码' }}</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon name="heroicons:key" class="w-5 h-5 text-gray-400" />
            </div>
            <input v-model="config.cal_password" type="password" class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">时区</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon name="heroicons:globe-alt" class="w-5 h-5 text-gray-400" />
            </div>
            <input
              v-model="config.timezone"
              type="text"
              placeholder="Asia/Shanghai"
              class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">周报前瞻天数</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon name="heroicons:calendar" class="w-5 h-5 text-gray-400" />
            </div>
            <input v-model="config.cal_lookahead_days" type="number" class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
          </div>
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">目标日历</label>
        <div class="flex items-start gap-3">
          <div class="flex-1 p-3 bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm min-h-[42px]">
            <div v-if="targetCalendars.length > 0" class="flex flex-wrap gap-2">
              <span v-for="c in targetCalendars" :key="c" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300">
                {{ c }}
              </span>
            </div>
            <span v-else class="text-gray-400 italic">未选择日历 (将使用默认)</span>
          </div>
          <button
            class="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            @click="openCalModal"
          >
            编辑
          </button>
        </div>
      </div>
    </div>

    <!-- Calendar Selection Modal -->
    <Modal v-model="showCalModal" title="选择目标日历">
      <div v-if="fetchingCalendars" class="flex justify-center py-8">
        <Icon name="line-md:loading-twotone-loop" class="w-8 h-8 text-primary-500" />
      </div>
      <div v-else class="max-h-60 overflow-y-auto space-y-2 p-1">
        <label v-for="c in calendars" :key="c.name" class="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            :checked="targetCalendars.includes(c.name)"
            class="rounded border-gray-300 text-primary-600 focus:ring-primary-500 transition-colors w-4 h-4"
            @change="toggleTargetCalendar(c.name)"
          />
          <span class="text-sm text-gray-700 dark:text-gray-300">{{ c.name }}</span>
        </label>
        <div v-if="calendars.length === 0" class="text-center py-4 text-gray-500">
          未找到日历
        </div>
      </div>
      <div class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
        <button class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm" @click="showCalModal = false">
          完成
        </button>
      </div>
    </Modal>
  </div>
</template>
