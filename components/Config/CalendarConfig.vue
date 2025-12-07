<script setup lang="ts">
import { Icon } from '@iconify/vue'
import Modal from '@/components/ui/Modal.vue'

const { config } = useUserConfig()
const toast = useToast()
const client = useSupabaseClient()

const calendars = ref<any[]>([])
const fetchingCalendars = ref(false)
const showCalModal = ref(false)

async function fetchCalendars() {
  if (!config.value.icloud_username || !config.value.icloud_app_password) {
    toast.add({ title: '请先填写 iCloud 账户信息', color: 'warning' })
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
            username: config.value.icloud_username,
            password: config.value.icloud_app_password
        },
        headers
    })
    calendars.value = data || []
  } catch (e: any) {
    console.error('Failed to fetch calendars', e)
    toast.add({ title: '获取日历列表失败', description: e.message, color: 'error' })
  } finally {
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
    set: (val) => {
        config.value.calendar_target = val.join(',')
    }
})

function toggleTargetCalendar(name: string) {
    const list = targetCalendars.value
    const index = list.indexOf(name)
    if (index === -1) {
        targetCalendars.value = [...list, name]
    } else {
        targetCalendars.value = list.filter(n => n !== name)
    }
}
</script>

<template>
  <div class="space-y-6 pt-6 border-t border-gray-100 dark:border-gray-700">
    <div class="flex items-center justify-between mb-6">
      <h4 class="font-medium text-gray-900 dark:text-white flex items-center gap-2">
        <Icon icon="heroicons:cloud" class="w-5 h-5 text-blue-500" />
        iCloud 日历同步
      </h4>
      <label class="inline-flex items-center cursor-pointer">
        <input type="checkbox" v-model="config.cal_enable" class="sr-only peer">
        <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
        <span class="ms-3 text-sm font-medium text-gray-700 dark:text-gray-300">启用</span>
      </label>
    </div>

    <div v-if="config.cal_enable" class="grid grid-cols-1 gap-6 p-6 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50 animate-fade-in">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Apple ID</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon icon="heroicons:user-circle" class="w-5 h-5 text-gray-400" />
            </div>
            <input v-model="config.icloud_username" type="text" class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">App-Specific Password</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon icon="heroicons:key" class="w-5 h-5 text-gray-400" />
            </div>
            <input v-model="config.icloud_app_password" type="password" class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Timezone</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon icon="heroicons:globe-alt" class="w-5 h-5 text-gray-400" />
            </div>
            <input v-model="config.timezone" type="text" placeholder="Asia/Shanghai" class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Lookahead Days</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon icon="heroicons:calendar" class="w-5 h-5 text-gray-400" />
            </div>
            <input v-model="config.cal_lookahead_days" type="number" class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
          </div>
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">目标日历 (图片识别)</label>
        <div class="flex items-start gap-3">
             <div class="flex-1 p-3 bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm min-h-[42px]">
                <div v-if="targetCalendars.length > 0" class="flex flex-wrap gap-2">
                  <span v-for="c in targetCalendars" :key="c" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                    {{ c }}
                  </span>
                </div>
                <span v-else class="text-gray-400 italic">未选择日历 (将使用默认)</span>
             </div>
             <button 
              @click="openCalModal"
              class="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              编辑
            </button>
          </div>
      </div>
    </div>

    <!-- Calendar Selection Modal -->
    <Modal v-model="showCalModal" title="选择目标日历">
      <div v-if="fetchingCalendars" class="flex justify-center py-8">
        <Icon icon="line-md:loading-twotone-loop" class="w-8 h-8 text-blue-500" />
      </div>
      <div v-else class="max-h-60 overflow-y-auto space-y-2 p-1">
        <label v-for="c in calendars" :key="c.name" class="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer">
            <input 
                type="checkbox" 
                :checked="targetCalendars.includes(c.name)"
                @change="toggleTargetCalendar(c.name)"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-colors w-4 h-4"
            >
            <span class="text-sm text-gray-700 dark:text-gray-300">{{ c.name }}</span>
        </label>
         <div v-if="calendars.length === 0" class="text-center py-4 text-gray-500">
          未找到日历
        </div>
      </div>
      <div class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
         <button @click="showCalModal = false" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
            完成
         </button>
      </div>
    </Modal>
  </div>
</template>
