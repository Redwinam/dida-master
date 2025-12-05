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
  exclude_project_name: '"日记","客栈"',
  llm_api_key: '',
  llm_model: 'deepseek-ai/DeepSeek-V3.1',
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

// Fetch config on mount
watch(user, async (u) => {
  if (u && !fetchedConfig.value) {
    try {
      const data = await $fetch('/api/config')
      if (data) {
        config.value = { ...config.value, ...data }
      }
      fetchedConfig.value = true
    } catch (e) {
      console.error('Failed to fetch config', e)
    }
  }
}, { immediate: true })

async function saveConfig() {
  loading.value = true
  try {
    await $fetch('/api/config', {
      method: 'POST',
      body: config.value
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
    const res: any = await $fetch('/api/actions/daily-note', { method: 'POST' })
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

async function triggerImageToCalendar() {
  if (!imageFile.value) return
  loadingAction.value = true
  
  const formData = new FormData()
  formData.append('image', imageFile.value)
  
  try {
    const res: any = await $fetch('/api/actions/image-calendar', {
      method: 'POST',
      body: formData
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
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
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
                <div class="space-y-5">
                  <div class="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                    <h4 class="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <Icon icon="heroicons:list-bullet" class="w-5 h-5 text-indigo-500" />
                      滴答清单 (Dida/TickTick)
                    </h4>
                    <NuxtLink to="/auth/dida" class="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                      <Icon icon="heroicons:link" class="w-3 h-3" />
                      Connect OAuth
                    </NuxtLink>
                  </div>
                  
                  <div class="space-y-1.5">
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Access Token</label>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon icon="heroicons:key" class="w-5 h-5 text-gray-400" />
                      </div>
                      <input v-model="config.dida_token" type="password" class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                    <p class="text-xs text-gray-500">请填入滴答清单 OAuth Token</p>
                  </div>

                  <div class="space-y-1.5">
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Project ID</label>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon icon="heroicons:folder" class="w-5 h-5 text-gray-400" />
                      </div>
                      <input v-model="config.dida_project_id" type="text" class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                  </div>

                  <div class="space-y-1.5">
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">排除项目 (CSV)</label>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon icon="heroicons:no-symbol" class="w-5 h-5 text-gray-400" />
                      </div>
                      <input v-model="config.exclude_project_name" type="text" class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                    <p class="text-xs text-gray-500">不希望被读取的项目名称</p>
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
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Model Name</label>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon icon="heroicons:cube" class="w-5 h-5 text-gray-400" />
                      </div>
                      <input v-model="config.llm_model" type="text" class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
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
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">目标日历 (图片识别)</label>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon icon="heroicons:calendar-days" class="w-5 h-5 text-gray-400" />
                      </div>
                      <input v-model="config.calendar_target" type="text" placeholder="个人,工作" class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                    <p class="text-xs text-gray-500">允许写入的日历名称，逗号分隔</p>
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
