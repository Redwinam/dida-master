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
    toast.add({ title: '日历事件已添加', description: res.events?.map((e: any) => e.title).join('、') || '创建成功', color: 'success' })
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
    icon="lucide:image"
    color-class="text-indigo-600 dark:text-indigo-400"
    bg-class="bg-indigo-100 dark:bg-indigo-900/50"
    gradient-from="from-indigo-500"
    gradient-to="to-indigo-400"
    :api-guide="apiGuide"
  >
    <div class="space-y-3">
      <div
        class="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-4 text-center hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-200 cursor-pointer bg-gray-50/50 dark:bg-gray-900/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10"
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
          <div class="w-12 h-12 mx-auto mb-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
            <Icon name="lucide:cloud-upload" class="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
          </div>
          <p class="text-sm text-gray-500 font-medium">
            点击或拖拽上传图片
          </p>
          <p class="text-xs text-gray-400 mt-1">
            支持 jpg、png、webp 等格式
          </p>
        </div>
        <div v-else class="relative group/preview">
          <img :src="imagePreview" class="max-h-40 mx-auto rounded-lg shadow-sm object-contain" />
          <button
            class="absolute top-1 right-1 p-1.5 bg-black/60 text-white rounded-full hover:bg-red-500 transition-colors opacity-0 group-hover/preview:opacity-100"
            @click.stop="clearImage"
          >
            <Icon name="lucide:x" class="w-4 h-4" />
          </button>
        </div>
      </div>

      <button
        :disabled="loadingAction || !imageFile"
        class="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        @click="triggerImageToCalendar"
      >
        <Icon v-if="loadingAction" name="line-md:loading-twotone-loop" class="w-5 h-5" />
        <Icon v-else name="lucide:sparkles" class="w-4 h-4" />
        开始识别并添加
      </button>
    </div>
  </FunctionCard>
</template>
