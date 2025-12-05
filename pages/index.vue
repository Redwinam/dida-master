<script setup lang="ts">
import { Icon } from '@iconify/vue'

// Use dynamic import for caldav related utils if they cause SSR issues, 
// but since this is index page, let's check imports.
// Actually, caldav is only used in server API, not client side.
// So the client side imports should be safe.

definePageMeta({
  middleware: 'auth'
})

const { user, logout } = useAuth()
const toast = useToast()

const config = ref({
  dida_token: '',
  dida_project_id: '',
  exclude_project_name: '',
  llm_api_key: '',
  llm_model: 'deepseek-ai/DeepSeek-V3',
  vision_model: 'Qwen/Qwen3-VL-32B-Instruct',
  llm_api_url: 'https://api.siliconflow.cn/v1/chat/completions',
  cal_enable: false,
  icloud_username: '',
  icloud_app_password: '',
  cal_lookahead_days: 2,
  calendar_target: ''
})

const loading = ref(false)
const loadingAction = ref(false)
const activeTab = ref<'config' | 'actions'>('config')
const fetchedConfig = ref(false)
const configLoadError = ref<string | null>(null)

const apiKey = ref('')
 const loadingApiKey = ref(false)
 const showApiKey = ref(false)
 const editingApiKey = ref(false)
 const newApiKeyInput = ref('')
 
 async function loadConfig() {
   configLoadError.value = null
   try {
     const data = await $fetch('/api/config')
     console.log('Frontend: Fetched config data:', data)
     if (data) {
       config.value = { ...config.value, ...data }
       console.log('Frontend: Updated config value:', config.value)
     }
     fetchedConfig.value = true
     
     // Check for token in query param (from OAuth callback)
     const route = useRoute()
     const tokenFromQuery = route.query.dida_token as string
     if (tokenFromQuery) {
       config.value.dida_token = tokenFromQuery
       // Auto save if we got a token
       await saveConfig()
       // Remove query param
       const router = useRouter()
       router.replace({ query: { ...route.query, dida_token: undefined } })
     }

     // If we have a token, fetch projects
     if (config.value.dida_token) {
       fetchProjects()
     }

   } catch (e: any) {
     console.error('Failed to fetch config', e)
     configLoadError.value = e.message || '加载配置失败'
   }
 }

 // Fetch config on mount
 watch(user, async (u) => {
   if (u) {
     // Get API Key from metadata - initially from cached user
     apiKey.value = u.user_metadata?.api_key || ''
     newApiKeyInput.value = apiKey.value
     
     // Force refresh user data from server to ensure metadata is up-to-date
     // This fixes the issue where local session has stale metadata after backend updates
     const client = useSupabaseClient()
     const { data: { user: freshUser } } = await client.auth.getUser()
     if (freshUser) {
         const freshKey = freshUser.user_metadata?.api_key || ''
         if (freshKey !== apiKey.value) {
             console.log('Frontend: Detected stale API Key, updating from server.')
             apiKey.value = freshKey
             newApiKeyInput.value = freshKey
             // Update global user object to reflect new metadata
             if (user.value) {
                 user.value.user_metadata = freshUser.user_metadata
             }
         }
     }
    
    if (!fetchedConfig.value) {
      // Ensure we have a valid session before fetching config
      if (freshUser) {
        await loadConfig()
      } else {
        console.warn('Frontend: Skipping loadConfig because user session is not fully ready (freshUser is null)')
      }
    }
  }
}, { immediate: true })

async function generateApiKey() {
   loadingApiKey.value = true
   try {
     const res: any = await $fetch('/api/auth/apikey', { method: 'POST' })
     apiKey.value = res.apiKey
     newApiKeyInput.value = res.apiKey
     // Update local user metadata to reflect change immediately without page refresh
     if (user.value) {
         user.value.user_metadata = { ...user.value.user_metadata, api_key: res.apiKey }
     }
     toast.add({ title: 'API Key 生成成功', color: 'success' })
   } catch (e: any) {
     toast.add({ title: '生成失败', description: e.message, color: 'error' })
   } finally {
     loadingApiKey.value = false
   }
 }
 
 async function saveManualApiKey() {
    if (!newApiKeyInput.value) return
    
    loadingApiKey.value = true
    try {
        const res: any = await $fetch('/api/auth/apikey', { 
            method: 'POST',
            body: { apiKey: newApiKeyInput.value }
        })
        apiKey.value = res.apiKey
        editingApiKey.value = false
        
        if (user.value) {
            user.value.user_metadata = { ...user.value.user_metadata, api_key: res.apiKey }
        }
        toast.add({ title: 'API Key 更新成功', color: 'success' })
    } catch (e: any) {
        toast.add({ title: '更新失败', description: e.message, color: 'error' })
    } finally {
        loadingApiKey.value = false
    }
 }

 async function revokeApiKey() {
   if (!confirm('确定要撤销当前的 API Key 吗？撤销后所有使用此 Key 的外部调用将失效。')) return
   
   loadingApiKey.value = true
   try {
     await $fetch('/api/auth/apikey', { method: 'DELETE' })
     apiKey.value = ''
     newApiKeyInput.value = ''
     if (user.value) {
         user.value.user_metadata = { ...user.value.user_metadata, api_key: null }
     }
     toast.add({ title: 'API Key 已撤销', color: 'success' })
   } catch (e: any) {
     toast.add({ title: '撤销失败', description: e.message, color: 'error' })
   } finally {
     loadingApiKey.value = false
   }
 }


const projects = ref<any[]>([])
const fetchingProjects = ref(false)

async function fetchProjects() {
  if (!config.value.dida_token) return
  fetchingProjects.value = true
  try {
    const data: any = await $fetch('/api/dida/projects', {
      params: { token: config.value.dida_token }
    })
    projects.value = data || []
  } catch (e) {
    console.error('Failed to fetch projects', e)
    toast.add({ title: '获取项目列表失败', description: '请检查Token是否过期', color: 'error' })
  } finally {
    fetchingProjects.value = false
  }
}

// Helper for multi-select
const excludedProjects = computed({
  get: () => {
    if (!config.value.exclude_project_name) return []
    // Parse "A","B" format
    return config.value.exclude_project_name
      .split(',')
      .map(s => s.trim().replace(/^"|"$/g, ''))
      .filter(Boolean)
  },
  set: (val) => {
    // Join with quotes
    config.value.exclude_project_name = val.map(s => `"${s}"`).join(',')
  }
})

function toggleExcludedProject(name: string) {
  const list = excludedProjects.value
  const index = list.indexOf(name)
  if (index === -1) {
    excludedProjects.value = [...list, name]
  } else {
    excludedProjects.value = list.filter(n => n !== name)
  }
}

// Calendar logic
const calendars = ref<any[]>([])
const fetchingCalendars = ref(false)

async function fetchCalendars() {
  if (!config.value.icloud_username || !config.value.icloud_app_password) return
  
  fetchingCalendars.value = true
  try {
    // Pass credentials if needed, but usually they are saved in backend. 
    // However, if user just typed them, they might not be saved yet if they haven't clicked save.
    // So we pass them in query to be safe and support "Test Connection" style immediately.
    const data: any = await $fetch('/api/cal/calendars', {
        params: {
            username: config.value.icloud_username,
            password: config.value.icloud_app_password
        }
    })
    calendars.value = data || []
    
    // If we have calendars but no target selected, select the first one by default if empty
    // But user might want multiple.
  } catch (e: any) {
    console.error('Failed to fetch calendars', e)
    toast.add({ title: '获取日历列表失败', description: e.message, color: 'error' })
  } finally {
    fetchingCalendars.value = false
  }
}

// Computed for calendar target (comma separated string <-> array)
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

// Auto fetch calendars if enabled and credentials exist on load
watch(() => [config.value.cal_enable, config.value.icloud_username, config.value.icloud_app_password], ([enable, user, pass]) => {
    if (enable && user && pass && calendars.value.length === 0 && !fetchingCalendars.value) {
        // Debounce slightly or just call it
        // We can check if we already have data or if fetchedConfig is true
        if (fetchedConfig.value) {
             // Avoid auto-fetch on every keystroke, maybe add a button instead or debounce
             // For now, let's rely on the button, or fetch once on mount if credentials exist.
        }
    }
})
// Actually, better to fetch once when config is loaded if enabled
watch(fetchedConfig, (val) => {
    if (val && config.value.cal_enable && config.value.icloud_username) {
        fetchCalendars()
    }
})

async function saveConfig() {
  loading.value = true
  try {
    const client = useSupabaseClient()
    const { data: { session } } = await client.auth.getSession()
    await $fetch('/api/config', {
      method: 'POST',
      body: config.value,
      headers: {
        Authorization: session?.access_token ? `Bearer ${session.access_token}` : ''
      }
    })
    toast.add({ title: '配置已保存', color: 'success' })
  } catch (e: any) {
    toast.add({ title: '保存失败', description: e.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

async function triggerDailyNote() {
  loadingAction.value = true
  try {
    const client = useSupabaseClient()
    const { data: { session } } = await client.auth.getSession()
    const res: any = await $fetch('/api/actions/daily-note', { 
        method: 'POST',
        headers: {
            Authorization: session?.access_token ? `Bearer ${session.access_token}` : ''
        }
    })
    toast.add({ title: '每日笔记生成成功', description: res.message, color: 'success' })
  } catch (e: any) {
    toast.add({ title: '生成失败', description: e.message, color: 'error' })
  } finally {
    loadingAction.value = false
  }
}

// Image to Calendar Logic
const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const textInput = ref('')

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files[0]) {
    imageFile.value = input.files[0]
    imagePreview.value = URL.createObjectURL(imageFile.value)
  }
}

function clearImage() {
  imageFile.value = null
  imagePreview.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

async function triggerTextToCalendar() {
  if (!textInput.value) return
  loadingAction.value = true
  
  try {
    const client = useSupabaseClient()
    const { data: { session } } = await client.auth.getSession()
    const res: any = await $fetch('/api/actions/text-calendar', {
      method: 'POST',
      body: { text: textInput.value },
      headers: {
        Authorization: session?.access_token ? `Bearer ${session.access_token}` : ''
      }
    })
    toast.add({ title: '日历事件已添加', description: `添加了 ${res.events?.length || 0} 个事件`, color: 'success' })
    textInput.value = ''
  } catch (e: any) {
    toast.add({ title: '处理失败', description: e.message, color: 'error' })
  } finally {
    loadingAction.value = false
  }
}

async function triggerImageToCalendar() {
  if (!imageFile.value) return
  loadingAction.value = true
  
  const formData = new FormData()
  formData.append('image', imageFile.value)
  
  try {
    const client = useSupabaseClient()
    const { data: { session } } = await client.auth.getSession()
    const res: any = await $fetch('/api/actions/image-calendar', {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: session?.access_token ? `Bearer ${session.access_token}` : ''
      }
    })
    toast.add({ title: '日历事件已添加', description: `添加了 ${res.events?.length || 0} 个事件`, color: 'success' })
    clearImage()
  } catch (e: any) {
    toast.add({ title: '处理失败', description: e.message, color: 'error' })
  } finally {
    loadingAction.value = false
  }
}
</script>

<template>
  <div class="min-h-screen p-4 md:p-8 transition-colors duration-300">
    <div class="max-w-5xl mx-auto">
      <!-- Header -->
      <div class="flex flex-col md:flex-row justify-between items-center mb-8 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all">
        <div class="flex items-center gap-4 mb-4 md:mb-0">
          <div class="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
            <Icon icon="heroicons:check-circle" class="w-8 h-8" />
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              滴答清单助手
            </h1>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Task Master & Time Management</p>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <div class="text-right hidden md:block">
            <div class="text-sm font-medium text-gray-900 dark:text-white">{{ user?.email }}</div>
            <div class="text-xs text-green-500 font-medium flex items-center justify-end gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              Online
            </div>
          </div>
          <button 
            @click="logout" 
            class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Icon icon="heroicons:arrow-right-on-rectangle" class="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <div class="flex space-x-1 rounded-xl bg-gray-200/50 dark:bg-gray-800/50 p-1 mb-8 w-full md:w-fit">
        <button
          v-for="tab in ['config', 'actions']"
          :key="tab"
          @click="activeTab = tab as any"
          :class="[
            'w-full md:w-auto flex items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium leading-5 transition-all duration-200',
            activeTab === tab
              ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:bg-white/12 hover:text-gray-800 dark:hover:text-gray-200'
          ]"
        >
          <Icon :icon="tab === 'config' ? 'heroicons:cog-6-tooth' : 'heroicons:bolt'" class="w-5 h-5" />
          {{ tab === 'config' ? '系统配置' : '功能中心' }}
        </button>
      </div>

      <!-- Config Tab -->
      <div v-if="activeTab === 'config'" class="space-y-6">
        <!-- Loading State -->
        <div v-if="!fetchedConfig && !configLoadError" class="flex flex-col items-center justify-center py-20 animate-fade-in">
          <div class="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-full mb-4">
            <Icon icon="line-md:loading-twotone-loop" class="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p class="text-gray-500 dark:text-gray-400 font-medium">正在加载配置信息...</p>
          <p class="text-sm text-gray-400 dark:text-gray-500 mt-2">请稍候，正在从服务器获取最新数据</p>
        </div>

        <!-- Error State -->
        <div v-else-if="configLoadError" class="flex flex-col items-center justify-center py-20 animate-fade-in">
           <div class="p-4 bg-red-50 dark:bg-red-900/20 rounded-full mb-4">
             <Icon icon="heroicons:exclamation-triangle" class="w-8 h-8 text-red-500" />
           </div>
           <p class="text-gray-900 dark:text-white font-medium text-lg">加载配置失败</p>
           <p class="text-gray-500 dark:text-gray-400 mt-2 mb-6 max-w-md text-center">{{ configLoadError }}</p>
           <button 
             @click="loadConfig" 
             class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
           >
             <Icon icon="heroicons:arrow-path" class="w-4 h-4" />
             重试
           </button>
        </div>

        <div v-else class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden animate-fade-in">
          <div class="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Icon icon="heroicons:adjustments-horizontal" class="w-5 h-5 text-gray-400" />
              全局配置
            </h3>
            <button 
              @click="saveConfig" 
              :disabled="loading"
              class="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon v-if="loading" icon="line-md:loading-twotone-loop" class="w-4 h-4" />
              <Icon v-else icon="heroicons:check" class="w-4 h-4" />
              保存所有更改
            </button>
          </div>

          <div class="p-6 md:p-8">
            <form @submit.prevent="saveConfig" class="space-y-8">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                <!-- 滴答清单 -->
                <div class="space-y-6">
                  <div class="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                    <h4 class="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <Icon icon="heroicons:list-bullet" class="w-5 h-5 text-indigo-500" />
                      滴答清单 (Dida/TickTick)
                    </h4>
                  </div>
                  
                  <div class="space-y-1.5">
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">连接状态</label>
                    <div v-if="!config.dida_token" class="flex">
                        <a href="/api/auth/dida/authorize" class="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200">
                            <Icon icon="heroicons:link" class="w-5 h-5 mr-2" />
                            点击连接滴答清单
                        </a>
                    </div>
                    <div v-else class="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-800">
                        <div class="flex items-center gap-2 text-green-700 dark:text-green-400">
                            <Icon icon="heroicons:check-circle" class="w-5 h-5" />
                            <span class="text-sm font-medium">已连接</span>
                        </div>
                        <button @click="config.dida_token = ''" class="text-xs text-gray-500 hover:text-red-500 underline">断开连接</button>
                    </div>
                  </div>

                  <div v-if="config.dida_token" class="space-y-4 animate-fade-in">
                    <div class="space-y-1.5">
                        <label class="text-sm font-medium text-gray-700 dark:text-gray-300 flex justify-between">
                            <span>目标项目 (用于生成日记)</span>
                            <button @click="fetchProjects" class="text-xs text-indigo-600 hover:text-indigo-500 flex items-center gap-1">
                                <Icon :icon="fetchingProjects ? 'line-md:loading-twotone-loop' : 'heroicons:arrow-path'" class="w-3 h-3" />
                                刷新列表
                            </button>
                        </label>
                        <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Icon icon="heroicons:folder" class="w-5 h-5 text-gray-400" />
                        </div>
                        <select v-model="config.dida_project_id" class="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm appearance-none">
                            <option value="" disabled>选择一个项目...</option>
                            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
                        </select>
                        <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <Icon icon="heroicons:chevron-up-down" class="w-4 h-4 text-gray-400" />
                        </div>
                        </div>
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">排除项目 (不读取任务)</label>
                        <div class="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 p-3 max-h-48 overflow-y-auto space-y-2">
                            <div v-if="projects.length === 0 && !fetchingProjects" class="text-xs text-gray-500 text-center py-2">
                                点击上方刷新按钮获取项目列表
                            </div>
                            <div v-if="fetchingProjects" class="flex justify-center py-2">
                                <Icon icon="line-md:loading-twotone-loop" class="w-5 h-5 text-gray-400" />
                            </div>
                            <label v-for="p in projects" :key="p.id" class="flex items-center gap-2 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    :checked="excludedProjects.includes(p.name)"
                                    @change="toggleExcludedProject(p.name)"
                                    class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-colors"
                                >
                                <span class="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{{ p.name }}</span>
                            </label>
                        </div>
                        <p class="text-xs text-gray-500">选中项目中的任务将不会被包含在每日总结中</p>
                    </div>
                  </div>
                </div>

                <!-- LLM -->
                <div class="space-y-5">
                  <h4 class="font-medium text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                    <Icon icon="heroicons:cpu-chip" class="w-5 h-5 text-purple-500" />
                    大模型 (LLM)
                  </h4>
                  
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
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Model Name (Text)</label>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon icon="heroicons:chat-bubble-bottom-center-text" class="w-5 h-5 text-gray-400" />
                      </div>
                      <input v-model="config.llm_model" type="text" placeholder="e.g. deepseek-ai/DeepSeek-V3" class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                  </div>

                  <div class="space-y-1.5">
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Model Name (Vision)</label>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon icon="heroicons:photo" class="w-5 h-5 text-gray-400" />
                      </div>
                      <input v-model="config.vision_model" type="text" placeholder="e.g. Qwen/Qwen3-VL-32B-Instruct" class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
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
                </div>
              </div>

              <!-- API Access -->
              <div class="pt-6 mt-6 border-t border-gray-100 dark:border-gray-700">
                <h4 class="font-medium text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <Icon icon="heroicons:key" class="w-5 h-5 text-orange-500" />
                  API 访问凭证
                </h4>
                <div class="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50 space-y-4">
                   <p class="text-sm text-gray-500 dark:text-gray-400">
                     使用此 Token 可以通过外部工具（如快捷指令、Cron Job）调用 API，无需登录。
                   </p>
                   
                   <div v-if="!apiKey" class="flex flex-col items-center justify-center py-4 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg">
                      <p class="text-sm text-gray-500 mb-3">您尚未设置 API Key</p>
                      <button 
                          @click="generateApiKey" 
                          :disabled="loadingApiKey"
                          class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                      >
                          <Icon v-if="loadingApiKey" icon="line-md:loading-twotone-loop" class="w-4 h-4" />
                          <Icon v-else icon="heroicons:sparkles" class="w-4 h-4" />
                          随机生成
                      </button>
                   </div>

                   <div v-else class="space-y-3">
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">API Key</label>
                    <div class="flex gap-2">
                        <div class="relative flex-1">
                            <input 
                                :value="apiKey" 
                                readonly
                                :type="showApiKey ? 'text' : 'password'" 
                                class="block w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 sm:text-sm font-mono" 
                            />
                            <button 
                                @click.prevent="showApiKey = !showApiKey"
                                class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <Icon :icon="showApiKey ? 'heroicons:eye-slash' : 'heroicons:eye'" class="w-4 h-4" />
                            </button>
                        </div>
                        <button 
                            @click.prevent="() => { navigator.clipboard.writeText(apiKey); toast.add({ title: 'Copied!', color: 'success' }) }"
                            class="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                            title="复制"
                        >
                            <Icon icon="heroicons:clipboard" class="w-5 h-5" />
                        </button>
                        <button 
                            @click="revokeApiKey"
                            class="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                            title="撤销 Key"
                        >
                            <Icon icon="heroicons:trash" class="w-5 h-5" />
                        </button>
                    </div>
                    <p class="text-xs text-gray-500 mt-2">
                        用法: Header <code>x-api-key: YOUR_TOKEN</code> 或 Query <code>?api_key=YOUR_TOKEN</code>
                    </p>
                   </div>
                </div>
              </div>

              <!-- iCloud -->
              <div class="pt-6 mt-6 border-t border-gray-100 dark:border-gray-700">
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
                
                <div v-if="config.cal_enable" class="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50">
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
                  <div class="space-y-1.5">
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Lookahead Days</label>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon icon="heroicons:calendar" class="w-5 h-5 text-gray-400" />
                      </div>
                      <input v-model="config.cal_lookahead_days" type="number" class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                    <p class="text-xs text-gray-500">读取未来几天的日历</p>
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300 flex justify-between">
                        <span>目标日历 (图片识别)</span>
                        <button @click.prevent="fetchCalendars" class="text-xs text-blue-600 hover:text-blue-500 flex items-center gap-1">
                            <Icon :icon="fetchingCalendars ? 'line-md:loading-twotone-loop' : 'heroicons:arrow-path'" class="w-3 h-3" />
                            刷新日历列表
                        </button>
                    </label>
                    
                    <div v-if="calendars.length > 0 || fetchingCalendars" class="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 p-3 max-h-48 overflow-y-auto space-y-2">
                        <div v-if="fetchingCalendars" class="flex justify-center py-2">
                            <Icon icon="line-md:loading-twotone-loop" class="w-5 h-5 text-gray-400" />
                        </div>
                        <label v-for="c in calendars" :key="c.name" class="flex items-center gap-2 cursor-pointer group">
                            <input 
                                type="checkbox" 
                                :checked="targetCalendars.includes(c.name)"
                                @change="toggleTargetCalendar(c.name)"
                                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-colors"
                            >
                            <span class="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{{ c.name }}</span>
                        </label>
                    </div>
                    <div v-else class="relative">
                      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon icon="heroicons:calendar-days" class="w-5 h-5 text-gray-400" />
                      </div>
                      <input v-model="config.calendar_target" type="text" placeholder="个人,工作" class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                    <p class="text-xs text-gray-500">允许写入的日历名称 (LLM 将从中选择最合适的)</p>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Actions Tab -->
      <div v-else-if="activeTab === 'actions'" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <!-- Daily Note Card -->
        <div class="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all duration-300">
          <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Icon icon="heroicons:document-text" class="w-48 h-48 text-indigo-600" />
          </div>
          
          <div class="p-6 relative z-10">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <div class="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                <Icon icon="heroicons:document-text" class="w-6 h-6" />
              </div>
              每日笔记生成
            </h3>
            <p class="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed">
              自动从滴答清单获取昨日完成的任务和今日待办事项，利用 LLM 总结并生成每日笔记，推送到指定位置。
            </p>
            <button 
              @click="triggerDailyNote" 
              :disabled="loadingAction"
              class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon v-if="loadingAction" icon="line-md:loading-twotone-loop" class="w-5 h-5" />
              <Icon v-else icon="heroicons:play" class="w-5 h-5" />
              立即执行
            </button>
          </div>
        </div>

        <!-- Text to Calendar Card -->
        <div class="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all duration-300">
           <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Icon icon="heroicons:chat-bubble-bottom-center-text" class="w-48 h-48 text-green-600" />
          </div>

          <div class="p-6 relative z-10">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <div class="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg text-green-600 dark:text-green-400">
                <Icon icon="heroicons:chat-bubble-bottom-center-text" class="w-6 h-6" />
              </div>
              文本转日历事件
            </h3>
            <p class="text-gray-500 dark:text-gray-400 text-sm mb-4 leading-relaxed">
              直接输入自然语言文本（如"明天下午3点在会议室开会"），AI 自动解析并添加到日历。
            </p>

            <div class="space-y-4">
              <textarea 
                v-model="textInput"
                rows="4"
                placeholder="请输入日程信息..."
                class="block w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 sm:text-sm resize-none"
              ></textarea>

              <button 
                @click="triggerTextToCalendar" 
                :disabled="loadingAction || !textInput"
                class="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon v-if="loadingAction" icon="line-md:loading-twotone-loop" class="w-5 h-5" />
                <Icon v-else icon="heroicons:sparkles" class="w-5 h-5" />
                开始解析并添加
              </button>
            </div>
          </div>
        </div>

        <!-- Image to Calendar Card -->
        <div class="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all duration-300">
           <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Icon icon="heroicons:photo" class="w-48 h-48 text-purple-600" />
          </div>

          <div class="p-6 relative z-10">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <div class="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg text-purple-600 dark:text-purple-400">
                <Icon icon="heroicons:photo" class="w-6 h-6" />
              </div>
              图片转日历事件
            </h3>
            <p class="text-gray-500 dark:text-gray-400 text-sm mb-4 leading-relaxed">
              上传一张包含日程信息的图片（如海报、截图），AI 自动识别时间地点并添加到日历。
            </p>

            <div class="space-y-4">
              <div 
                class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center hover:border-purple-500 dark:hover:border-purple-500 transition-colors cursor-pointer bg-gray-50 dark:bg-gray-900/50"
                @click="fileInput?.click()"
                @drop.prevent="onFileSelect"
                @dragover.prevent
              >
                <input 
                  type="file" 
                  ref="fileInput" 
                  class="hidden" 
                  accept="image/*" 
                  @change="onFileSelect" 
                />
                
                <div v-if="!imagePreview" class="py-4">
                  <Icon icon="heroicons:cloud-arrow-up" class="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p class="text-sm text-gray-500">点击或拖拽上传图片</p>
                </div>
                <div v-else class="relative group/preview">
                  <img :src="imagePreview" class="max-h-40 mx-auto rounded-lg shadow-sm object-contain" />
                  <button 
                    @click.stop="clearImage" 
                    class="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors opacity-0 group-hover/preview:opacity-100"
                  >
                    <Icon icon="heroicons:x-mark" class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button 
                @click="triggerImageToCalendar" 
                :disabled="loadingAction || !imageFile"
                class="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon v-if="loadingAction" icon="line-md:loading-twotone-loop" class="w-5 h-5" />
                <Icon v-else icon="heroicons:sparkles" class="w-5 h-5" />
                开始识别并添加
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
