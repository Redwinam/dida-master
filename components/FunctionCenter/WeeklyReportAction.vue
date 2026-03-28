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

async function triggerWeeklyReport() {
  loadingAction.value = true
  try {
    const { data: { session } } = await client.auth.getSession()
    const res: any = await $fetch('/api/actions/weekly-report', {
      method: 'POST',
      headers: {
        Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
      },
    })
    if (res.status === 'queued') {
      toast.add({ title: '请求已提交', description: '周报正在后台生成中，请稍候... 完成后将自动推送到滴答清单。', color: 'success' })
    }
    else {
      toast.add({ title: '周报生成成功', description: res.message, color: 'success' })
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
  endpoint: '/api/actions/weekly-report',
  method: 'POST',
  description: '触发周报生成。需提供 API Key 或 Bearer Token。',
  example: `curl -X POST https://your-domain.com/api/actions/weekly-report \\
  -H "x-api-key: YOUR_API_KEY"`,
}
</script>

<template>
  <FunctionCard
    title="周报生成"
    description="自动获取过去一周完成的任务和日程，利用 LLM 生成周报，推送到指定项目。"
    icon="lucide:presentation"
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
        class="flex-1 py-2.5 px-4 bg-gradient-to-r from-accent-500 to-accent-400 hover:from-accent-400 hover:to-accent-300 text-white rounded-xl text-sm font-semibold shadow-md shadow-accent-500/20 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        @click="triggerWeeklyReport"
      >
        <Icon v-if="loadingAction" name="line-md:loading-twotone-loop" class="w-5 h-5" />
        <Icon v-else name="lucide:play" class="w-4 h-4" />
        立即生成
      </button>
      <button
        class="py-2.5 px-4 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 text-primary-600 dark:text-primary-400 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 border border-primary-200 dark:border-primary-800 active:scale-[0.98]"
        @click="emit('schedule')"
      >
        <Icon name="lucide:clock" class="w-4 h-4" />
        定时
      </button>
    </div>

    <div class="mt-3 text-center">
      <NuxtLink to="/history/weekly-reports" class="inline-flex items-center gap-1 text-sm text-primary-500 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors">
        <Icon name="lucide:history" class="w-3.5 h-3.5" />
        查看历史记录
      </NuxtLink>
    </div>
  </FunctionCard>
</template>
