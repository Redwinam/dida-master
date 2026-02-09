<script setup lang="ts">
import FunctionCard from './FunctionCard.vue'

const { $supabase } = useNuxtApp()
const client = $supabase as any
const toast = useToast()
const { config } = useUserConfig()

const emit = defineEmits<{
  (e: 'configure'): void
}>()

const loadingAction = ref(false)
const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const missingConfig = computed(() => {
  return !config.value.cal_username || !config.value.cal_password || !config.value.llm_api_key
})

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
    const { data: { session } } = await client.auth.getSession()
    const res: any = await $fetch('/api/actions/image-calendar', {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
      },
    })
    toast.add({ title: '日历事件已添加', description: `添加了 ${res.events?.length || 0} 个事件`, color: 'success' })
    clearImage()
  }
  catch (e: any) {
    toast.add({ title: '处理失败', description: e.message, color: 'error' })
  }
  finally {
    loadingAction.value = false
  }
}

const apiGuide = {
  endpoint: '/api/actions/image-calendar',
  method: 'POST',
  description: '上传图片（Multipart Form）并识别其中的日程信息添加到日历。',
  params: {
    image: 'Required. The image file (binary).',
  },
  example: `curl -X POST https://your-domain.com/api/actions/image-calendar \\
  -H "x-api-key: YOUR_API_KEY" \\
  -F "image=@/path/to/image.jpg"`,
}
</script>

<template>
  <FunctionCard
    title="图片转日历事件"
    description="上传一张包含日程信息的图片（如海报、截图），AI 自动识别时间地点并添加到日历。"
    icon="heroicons:photo"
    color-class="text-indigo-600 dark:text-indigo-400"
    bg-class="bg-indigo-100 dark:bg-indigo-900/50"
    :api-guide="apiGuide"
  >
    <div class="space-y-4">
      <div
        class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors cursor-pointer bg-gray-50 dark:bg-gray-900/50"
        @click="fileInput?.click()"
        @drop.prevent="onFileSelect"
        @dragover.prevent
      >
        <input
          ref="fileInput"
          type="file"
          class="hidden"
          accept="image/*"
          @change="onFileSelect"
        />

        <div v-if="!imagePreview" class="py-4">
          <Icon name="heroicons:cloud-arrow-up" class="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p class="text-sm text-gray-500">
            点击或拖拽上传图片
          </p>
        </div>
        <div v-else class="relative group/preview">
          <img :src="imagePreview" class="max-h-40 mx-auto rounded-lg shadow-sm object-contain" />
          <button
            class="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors opacity-0 group-hover/preview:opacity-100"
            @click.stop="clearImage"
          >
            <Icon name="heroicons:x-mark" class="w-4 h-4" />
          </button>
        </div>
      </div>

      <button
        :disabled="loadingAction || !imageFile"
        class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="triggerImageToCalendar"
      >
        <Icon v-if="loadingAction" name="line-md:loading-twotone-loop" class="w-5 h-5" />
        <Icon v-else name="heroicons:sparkles" class="w-5 h-5" />
        开始识别并添加
      </button>
    </div>
  </FunctionCard>
</template>
