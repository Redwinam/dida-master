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
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
    <div class="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-gray-800 dark:text-white">滴答清单助手</h1>
        <div class="flex gap-2 items-center">
          <span class="text-sm text-gray-500">{{ user?.email }}</span>
          <UButton color="neutral" variant="ghost" icon="i-heroicons-arrow-right-on-rectangle" @click="logout" />
        </div>
      </div>

      <UTabs :items="[{ label: '配置', slot: 'config' }, { label: '功能', slot: 'actions' }]">
        <template #config>
          <form @submit.prevent="saveConfig" class="space-y-4 mt-4">
            <UCard>
              <template #header>基础配置</template>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <UFormGroup label="滴答清单 Token">
                  <UInput v-model="config.dida_token" type="password" />
                </UFormGroup>
                <UFormGroup label="项目 ID (Project ID)">
                  <UInput v-model="config.dida_project_id" />
                </UFormGroup>
                <UFormGroup label="排除项目名 (CSV)">
                  <UInput v-model="config.exclude_project_name" />
                </UFormGroup>
              </div>
            </UCard>

            <UCard>
              <template #header>LLM 配置</template>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <UFormGroup label="API Key">
                  <UInput v-model="config.llm_api_key" type="password" />
                </UFormGroup>
                <UFormGroup label="Model">
                  <UInput v-model="config.llm_model" />
                </UFormGroup>
                <UFormGroup label="API URL">
                  <UInput v-model="config.llm_api_url" />
                </UFormGroup>
              </div>
            </UCard>

            <UCard>
              <template #header>日历配置 (iCloud)</template>
              <div class="space-y-4">
                <UCheckbox v-model="config.cal_enable" label="启用日历同步" />
                <div v-if="config.cal_enable" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <UFormGroup label="iCloud Username">
                    <UInput v-model="config.icloud_username" />
                  </UFormGroup>
                  <UFormGroup label="App Password">
                    <UInput v-model="config.icloud_app_password" type="password" />
                  </UFormGroup>
                  <UFormGroup label="Lookahead Days">
                    <UInput v-model="config.cal_lookahead_days" type="number" />
                  </UFormGroup>
                  <UFormGroup label="目标日历 (Image识别用, 逗号分隔)">
                     <UInput v-model="config.calendar_target" placeholder="个人,工作" />
                  </UFormGroup>
                </div>
              </div>
            </UCard>

            <div class="flex justify-end">
              <UButton type="submit" :loading="loading">保存配置</UButton>
            </div>
          </form>
        </template>

        <template #actions>
          <div class="space-y-6 mt-4">
            <UCard>
              <template #header>每日笔记生成</template>
              <p class="text-sm text-gray-500 mb-4">
                触发一次立即生成。将读取滴答清单任务，结合日历，调用 LLM 生成日报并写入滴答清单。
              </p>
              <UButton @click="triggerDailyNote" :loading="loadingAction">立即生成</UButton>
            </UCard>

            <UCard>
              <template #header>图片转日历 (Qwen-VL)</template>
              <p class="text-sm text-gray-500 mb-4">
                上传一张包含日程的图片，AI 将自动识别并添加到指定的日历中。
              </p>
              
              <div class="space-y-4">
                <input type="file" accept="image/*" @change="onFileSelect" class="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary-50 file:text-primary-700
                  hover:file:bg-primary-100
                "/>
                
                <div v-if="imagePreview" class="mt-2">
                  <img :src="imagePreview" class="max-h-64 rounded border" />
                </div>

                <UButton @click="triggerImageToCalendar" :disabled="!imageFile" :loading="loadingAction">
                  识别并添加
                </UButton>
              </div>
            </UCard>
          </div>
        </template>
      </UTabs>
    </div>
  </div>
</template>
