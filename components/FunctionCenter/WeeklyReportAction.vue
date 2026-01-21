<script setup lang="ts">
import { Icon } from '@iconify/vue'
import FunctionCard from './FunctionCard.vue'

const { $supabase } = useNuxtApp()
const client = $supabase as any
const toast = useToast()
const loadingAction = ref(false)

async function triggerWeeklyReport() {
  loadingAction.value = true
  try {
    const { data: { session } } = await client.auth.getSession()
    const res: any = await $fetch('/api/actions/weekly-report', { 
        method: 'POST',
        headers: {
            Authorization: session?.access_token ? `Bearer ${session.access_token}` : ''
        }
    })
    toast.add({ title: '周报生成成功', description: res.message, color: 'success' })
  } catch (e: any) {
    toast.add({ title: '生成失败', description: e.message, color: 'error' })
  } finally {
    loadingAction.value = false
  }
}

const apiGuide = {
    endpoint: '/api/actions/weekly-report',
    method: 'POST',
    description: '触发周报生成。需提供 API Key 或 Bearer Token。',
    example: `curl -X POST https://your-domain.com/api/actions/weekly-report \\
  -H "x-api-key: YOUR_API_KEY"`
}
</script>

<template>
  <FunctionCard
    title="周报生成"
    description="自动获取过去一周完成的任务和日程，利用 LLM 生成周报，推送到指定项目。"
    icon="heroicons:presentation-chart-bar"
    colorClass="text-green-600 dark:text-green-400"
    bgClass="bg-green-100 dark:bg-green-900/50"
    :apiGuide="apiGuide"
  >
    <button 
      @click="triggerWeeklyReport" 
      :disabled="loadingAction"
      class="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Icon v-if="loadingAction" icon="line-md:loading-twotone-loop" class="w-5 h-5" />
      <Icon v-else icon="heroicons:play" class="w-5 h-5" />
      立即生成
    </button>
    
    <div class="mt-3 text-center">
       <NuxtLink to="/history/weekly-reports" class="text-sm text-green-600 dark:text-green-400 hover:underline">
          查看历史记录
       </NuxtLink>
    </div>
  </FunctionCard>
</template>
