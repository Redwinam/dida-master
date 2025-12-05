<script setup lang="ts">
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

// Fetch config on mount
onMounted(async () => {
  try {
    const data = await $fetch('/api/config')
    if (data) {
      // Merge with default to avoid undefined
      config.value = { ...config.value, ...data }
    }
  } catch (e) {
    console.error('Failed to fetch config', e)
  }
})

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

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files[0]) {
    imageFile.value = input.files[0]
    imagePreview.value = URL.createObjectURL(imageFile.value)
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
  } catch (e: any) {
    toast.add({ title: '处理失败', description: e.message, color: 'error' })
  } finally {
    loadingAction.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
    <div class="max-w-5xl mx-auto">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UIcon name="i-heroicons-check-circle" class="w-8 h-8 text-primary-500" />
            滴答清单助手
          </h1>
          <p class="text-sm text-gray-500 mt-1">Task Master & Time Management</p>
        </div>
        <div class="flex items-center gap-4">
          <div class="text-right hidden md:block">
            <div class="text-sm font-medium text-gray-900 dark:text-white">{{ user?.email }}</div>
            <div class="text-xs text-gray-500">Online</div>
          </div>
          <UButton color="neutral" variant="soft" icon="i-heroicons-arrow-right-on-rectangle" @click="logout" label="Logout" />
        </div>
      </div>

      <UTabs :items="[{ label: '系统配置', slot: 'config', icon: 'i-heroicons-cog-6-tooth' }, { label: '功能中心', slot: 'actions', icon: 'i-heroicons-bolt' }]" class="w-full">
        <template #config>
          <UCard class="mt-6">
            <template #header>
              <div class="flex justify-between items-center">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">全局配置</h3>
                <UButton type="submit" :loading="loading" @click="saveConfig" color="primary" icon="i-heroicons-check">保存所有更改</UButton>
              </div>
            </template>

            <form @submit.prevent="saveConfig" class="space-y-8">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <!-- 滴答清单 -->
                <div class="space-y-4">
                  <h4 class="font-medium text-gray-900 dark:text-white border-b pb-2 border-gray-200 dark:border-gray-700">滴答清单 (Dida/TickTick)</h4>
                  <UFormField label="Access Token" required help="请填入滴答清单 OAuth Token">
                    <UInput v-model="config.dida_token" type="password" icon="i-heroicons-key" class="w-full" />
                  </UFormField>
                  <UFormField label="Project ID" required>
                    <UInput v-model="config.dida_project_id" icon="i-heroicons-folder" class="w-full" />
                  </UFormField>
                  <UFormField label="排除项目 (CSV)" help="不希望被读取的项目名称">
                    <UInput v-model="config.exclude_project_name" icon="i-heroicons-no-symbol" class="w-full" />
                  </UFormField>
                </div>

                <!-- LLM -->
                <div class="space-y-4">
                  <h4 class="font-medium text-gray-900 dark:text-white border-b pb-2 border-gray-200 dark:border-gray-700">大模型 (LLM)</h4>
                  <UFormField label="API Key" required>
                    <UInput v-model="config.llm_api_key" type="password" icon="i-heroicons-lock-closed" class="w-full" />
                  </UFormField>
                  <UFormField label="Model Name">
                    <UInput v-model="config.llm_model" icon="i-heroicons-cpu-chip" class="w-full" />
                  </UFormField>
                  <UFormField label="API URL">
                    <UInput v-model="config.llm_api_url" icon="i-heroicons-globe-alt" class="w-full" />
                  </UFormField>
                </div>
              </div>

              <!-- iCloud -->
              <div class="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div class="flex items-center justify-between">
                  <h4 class="font-medium text-gray-900 dark:text-white">iCloud 日历同步</h4>
                  <UCheckbox v-model="config.cal_enable" label="启用" />
                </div>
                
                <div v-if="config.cal_enable" class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <UFormField label="Apple ID">
                    <UInput v-model="config.icloud_username" icon="i-heroicons-user-circle" class="w-full" />
                  </UFormField>
                  <UFormField label="App-Specific Password">
                    <UInput v-model="config.icloud_app_password" type="password" icon="i-heroicons-key" class="w-full" />
                  </UFormField>
                  <UFormField label="Lookahead Days" help="读取未来几天的日历">
                    <UInput v-model="config.cal_lookahead_days" type="number" icon="i-heroicons-calendar" class="w-full" />
                  </UFormField>
                  <UFormField label="目标日历 (图片识别)" help="允许写入的日历名称，逗号分隔">
                     <UInput v-model="config.calendar_target" placeholder="个人,工作" icon="i-heroicons-calendar-days" class="w-full" />
                  </UFormField>
                </div>
              </div>
            </form>
          </UCard>
        </template>

        <template #actions>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <!-- Daily Note Card -->
            <UCard class="relative overflow-hidden group hover:ring-2 hover:ring-primary-500/50 transition-all">
              <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <UIcon name="i-heroicons-document-text" class="w-32 h-32" />
              </div>
              <template #header>
                <h3 class="text-lg font-semibold flex items-center gap-2">
                  <UIcon name="i-heroicons-sparkles" class="text-yellow-500" />
                  每日智能日报
                </h3>
              </template>
              <p class="text-gray-600 dark:text-gray-400 mb-6 min-h-[3rem]">
                读取滴答清单未完成任务与 iCloud 日程，由 AI 生成专业的时间管理建议，并自动写入滴答清单笔记。
              </p>
              <UButton @click="triggerDailyNote" :loading="loadingAction" block size="lg" color="primary" icon="i-heroicons-play">
                立即生成日报
              </UButton>
            </UCard>

            <!-- Image to Calendar Card -->
            <UCard class="relative overflow-hidden group hover:ring-2 hover:ring-primary-500/50 transition-all">
              <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <UIcon name="i-heroicons-photo" class="w-32 h-32" />
              </div>
              <template #header>
                <h3 class="text-lg font-semibold flex items-center gap-2">
                  <UIcon name="i-heroicons-camera" class="text-blue-500" />
                  图片转日历
                </h3>
              </template>
              <p class="text-gray-600 dark:text-gray-400 mb-6 min-h-[3rem]">
                上传包含日程的海报或截图，AI (Qwen-VL) 自动识别时间地点，一键添加到您的 iCloud 日历。
              </p>
              
              <div class="space-y-4">
                <div class="flex items-center justify-center w-full">
                  <label for="dropzone-file" class="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500">
                      <div class="flex flex-col items-center justify-center pt-5 pb-6" v-if="!imagePreview">
                          <UIcon name="i-heroicons-cloud-arrow-up" class="w-8 h-8 text-gray-500 mb-2" />
                          <p class="text-sm text-gray-500 dark:text-gray-400"><span class="font-semibold">点击上传</span> 或拖拽图片</p>
                      </div>
                      <img v-else :src="imagePreview" class="h-full object-contain p-2" />
                      <input id="dropzone-file" type="file" accept="image/*" class="hidden" @change="onFileSelect" />
                  </label>
                </div>

                <UButton @click="triggerImageToCalendar" :disabled="!imageFile" :loading="loadingAction" block size="lg" color="neutral" icon="i-heroicons-arrow-up-tray">
                  开始识别并添加
                </UButton>
              </div>
            </UCard>
          </div>
        </template>
      </UTabs>
    </div>
  </div>
</template>
