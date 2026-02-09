<script setup lang="ts">
import FunctionCard from './FunctionCard.vue'

const { $supabase } = useNuxtApp()
const client = $supabase as any
const toast = useToast()
const { config, loading, fetched } = useUserConfig()

const emit = defineEmits<{
  (e: 'configure'): void
  (e: 'schedule'): void
}>()

const loadingAction = ref(false)

const missingConfig = computed(() => {
  if (loading.value || !fetched.value) return false
  return !config.value.dida_token || !config.value.llm_api_key
})

async function triggerDailyNote() {
  loadingAction.value = true
  try {
    const { data: { session } } = await client.auth.getSession()
    const res: any = await $fetch('/api/actions/daily-note', {
      method: 'POST',
      headers: {
        Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
      },
    })
    if (res.status === 'queued') {
      toast.add({ title: '请求已提交', description: 'AI 正在后台生成内容，请稍候... 完成后将自动同步到滴答清单。', color: 'success' })
    }
    else {
      toast.add({ title: '每日笔记生成成功', description: res.message, color: 'success' })
    }
  }
  catch (e: any) {
    toast.add({ title: '生成失败', description: e.message, color: 'error' })
  }
  finally {
    loadingAction.value = false
  }
}

const apiGuide = {
  endpoint: '/api/actions/daily-note',
  method: 'POST',
  description: '触发每日笔记生成。需提供 API Key 或 Bearer Token。',
  example: `curl -X POST https://your-domain.com/api/actions/daily-note \\
  -H "x-api-key: YOUR_API_KEY"`,
}
</script>

<template>
  <FunctionCard
    title="每日笔记生成"
    description="自动从滴答清单获取昨日完成的任务和今日待办事项，利用 LLM 总结并生成每日笔记，推送到指定位置。"
    icon="heroicons:document-text"
    color-class="text-primary-600 dark:text-primary-400"
    bg-class="bg-primary-100 dark:bg-primary-900/50"
    :api-guide="apiGuide"
    :missing-config="missingConfig"
    missing-config-text="需要配置滴答清单 Token 和 LLM API Key。"
    @configure="emit('configure')"
  >
    <div class="flex gap-2">
      <button
        :disabled="loadingAction"
        class="flex-1 py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="triggerDailyNote"
      >
        <Icon v-if="loadingAction" name="line-md:loading-twotone-loop" class="w-5 h-5" />
        <Icon v-else name="heroicons:play" class="w-5 h-5" />
        立即执行
      </button>
      <button
        class="py-2.5 px-4 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 text-primary-600 dark:text-primary-400 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 border border-primary-200 dark:border-primary-800"
        @click="emit('schedule')"
      >
        <Icon name="heroicons:clock" class="w-4 h-4" />
        定时执行
      </button>
    </div>

    <div class="mt-3 text-center">
      <NuxtLink to="/history/daily-notes" class="text-sm text-primary-600 dark:text-primary-400 hover:underline">
        查看历史记录
      </NuxtLink>
    </div>
  </FunctionCard>
</template>
