<script setup lang="ts">
import { Icon } from '@iconify/vue'
import FunctionCard from './FunctionCard.vue'

const { $supabase } = useNuxtApp()
const client = $supabase as any
const toast = useToast()
const loadingAction = ref(false)

async function triggerDailyNote() {
  loadingAction.value = true
  try {
    const { data: { session } } = await client.auth.getSession()
    const res: any = await $fetch('/api/actions/daily-note', { 
        method: 'POST',
        headers: {
            Authorization: session?.access_token ? `Bearer ${session.access_token}` : ''
        }
    })
    toast.add({ title: '每日笔记生成成功', description: res.message, color: 'success' })
  } catch (e: any) {
    toast.add({ title: '生成失败', description: e.message, color: 'error' })
  } finally {
    loadingAction.value = false
  }
}

const apiGuide = {
    endpoint: '/api/actions/daily-note',
    method: 'POST',
    description: '触发每日笔记生成。需提供 API Key 或 Bearer Token。',
    example: `curl -X POST https://your-domain.com/api/actions/daily-note \\
  -H "x-api-key: YOUR_API_KEY"`
}
</script>

<template>
  <FunctionCard
    title="每日笔记生成"
    description="自动从滴答清单获取昨日完成的任务和今日待办事项，利用 LLM 总结并生成每日笔记，推送到指定位置。"
    icon="heroicons:document-text"
    colorClass="text-indigo-600 dark:text-indigo-400"
    bgClass="bg-indigo-100 dark:bg-indigo-900/50"
    :apiGuide="apiGuide"
  >
    <button 
      @click="triggerDailyNote" 
      :disabled="loadingAction"
      class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Icon v-if="loadingAction" icon="line-md:loading-twotone-loop" class="w-5 h-5" />
      <Icon v-else icon="heroicons:play" class="w-5 h-5" />
      立即执行
    </button>
    
    <div class="mt-3 text-center">
       <NuxtLink to="/history/daily-notes" class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
          查看历史记录
       </NuxtLink>
    </div>
  </FunctionCard>
</template>
