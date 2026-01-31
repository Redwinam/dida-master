<script setup lang="ts">
import { Icon } from '@iconify/vue'
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

const apiGuide = {
    endpoint: '/api/actions/text-calendar',
    method: 'POST',
    description: '解析自然语言文本并添加到日历。',
    params: {
        text: 'Required. The natural language text describing the event.'
    },
    example: `curl -X POST https://your-domain.com/api/actions/text-calendar \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Meeting tomorrow at 3pm"}'`
}
</script>

<template>
  <FunctionCard
    title="文本转日历事件"
    description="直接输入自然语言文本（如'明天下午3点在会议室开会'），AI 自动解析并添加到日历。"
    icon="heroicons:chat-bubble-bottom-center-text"
    colorClass="text-cyan-600 dark:text-cyan-400"
    bgClass="bg-cyan-100 dark:bg-cyan-900/50"
    :apiGuide="apiGuide"
  >
    <div class="space-y-4">
      <textarea 
        v-model="textInput"
        rows="4"
        placeholder="请输入日程信息..."
        class="block w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm resize-none"
      ></textarea>

      <button 
        @click="triggerTextToCalendar" 
        :disabled="loadingAction || !textInput"
        class="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Icon v-if="loadingAction" icon="line-md:loading-twotone-loop" class="w-5 h-5" />
        <Icon v-else icon="heroicons:sparkles" class="w-5 h-5" />
        开始解析并添加
      </button>
    </div>
  </FunctionCard>
</template>
