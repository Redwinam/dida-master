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
const textInput = ref('')

const missingConfig = computed(() => {
  return !config.value.cal_username || !config.value.cal_password || !config.value.llm_api_key
})

async function triggerTextToCalendar() {
  if (!textInput.value) return
  loadingAction.value = true

  try {
    const { data: { session } } = await client.auth.getSession()
    const res: any = await $fetch('/api/actions/text-calendar', {
      method: 'POST',
      body: { text: textInput.value },
      headers: {
        Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
      },
    })
    toast.add({ title: '日历事件已添加', description: res.events?.map((e: any) => e.title).join('、') || '创建成功', color: 'success' })
    textInput.value = ''
  }
  catch (e: any) {
    toast.add({ title: '处理失败', description: e.message, color: 'error' })
  }
  finally {
    loadingAction.value = false
  }
}

const apiGuide = {
  endpoint: '/api/actions/text-calendar',
  method: 'POST',
  description: '解析自然语言文本并添加到日历。',
  params: {
    text: 'Required. The natural language text describing the event.',
  },
  example: `curl -X POST https://your-domain.com/api/actions/text-calendar \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Meeting tomorrow at 3pm"}'`,
}
</script>

<template>
  <FunctionCard
    title="文本转日历事件"
    description="直接输入自然语言文本（如'明天下午3点在会议室开会'），AI 自动解析并添加到日历。"
    icon="lucide:message-square-text"
    color-class="text-primary-600 dark:text-primary-400"
    bg-class="bg-primary-100 dark:bg-primary-900/50"
    :api-guide="apiGuide"
  >
    <div class="space-y-3">
      <textarea
        v-model="textInput"
        rows="4"
        placeholder="请输入日程信息..."
        class="block w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 sm:text-sm resize-none transition-all duration-200"
      ></textarea>

      <button
        :disabled="loadingAction || !textInput"
        class="w-full py-2.5 px-4 bg-gradient-to-r from-accent-500 to-accent-400 hover:from-accent-400 hover:to-accent-300 text-white rounded-xl text-sm font-semibold shadow-md shadow-accent-500/20 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer"
        @click="triggerTextToCalendar"
      >
        <Icon v-if="loadingAction" name="line-md:loading-twotone-loop" class="w-5 h-5" />
        <Icon v-else name="lucide:sparkles" class="w-4 h-4" />
        开始解析并添加
      </button>
    </div>
  </FunctionCard>
</template>
