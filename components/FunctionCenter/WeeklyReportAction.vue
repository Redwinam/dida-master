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
    icon="heroicons:presentation-chart-bar"
    color-class="text-teal-600 dark:text-teal-400"
    bg-class="bg-teal-100 dark:bg-teal-900/50"
    :api-guide="apiGuide"
    :missing-config="missingConfig"
    missing-config-text="需要配置滴答清单 Token 和 LLM API Key。"
    @configure="emit('configure')"
  >
    <div class="flex gap-2">
      <button
        :disabled="loadingAction"
        class="flex-1 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="triggerWeeklyReport"
      >
        <Icon v-if="loadingAction" name="line-md:loading-twotone-loop" class="w-5 h-5" />
        <Icon v-else name="heroicons:play" class="w-5 h-5" />
        立即生成
      </button>
      <button
        class="py-2.5 px-3 bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-600 dark:text-teal-400 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 border border-teal-200 dark:border-teal-800"
        title="配置定时执行"
        @click="emit('schedule')"
      >
        <Icon name="heroicons:clock" class="w-4 h-4" />
        定时
      </button>
    </div>

    <div class="mt-3 text-center">
      <NuxtLink to="/history/weekly-reports" class="text-sm text-teal-600 dark:text-teal-400 hover:underline">
        查看历史记录
      </NuxtLink>
    </div>
  </FunctionCard>
</template>
