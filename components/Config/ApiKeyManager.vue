<script setup lang="ts">
import { Icon } from '@iconify/vue'

const { user } = useSession()
const { $supabase } = useNuxtApp()
const client = $supabase as any
const toast = useToast()

const apiKey = ref('')
const loadingApiKey = ref(false)
const showApiKey = ref(false)
const newApiKeyInput = ref('')

// Initialize from user metadata
watch(user, u => {
  if (u) {
    apiKey.value = u.user_metadata?.api_key || ''
    newApiKeyInput.value = apiKey.value
  }
}, { immediate: true })

function copyApiKey() {
  if (import.meta.client && navigator.clipboard) {
    navigator.clipboard.writeText(apiKey.value)
    toast.add({ title: 'Copied!', color: 'success' })
  }
}

async function generateApiKey() {
  loadingApiKey.value = true
  try {
    const { data: { session } } = await client.auth.getSession()
    const headers: Record<string, string> = {}
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`

    const res: any = await $fetch('/api/auth/apikey', {
      method: 'POST',
      headers,
    })
    apiKey.value = res.apiKey
    newApiKeyInput.value = res.apiKey

    if (user.value) {
      user.value.user_metadata = { ...user.value.user_metadata, api_key: res.apiKey }
    }
    toast.add({ title: 'API Key 生成成功', color: 'success' })
  }
  catch (e: any) {
    toast.add({ title: '生成失败', description: e.message, color: 'error' })
  }
  finally {
    loadingApiKey.value = false
  }
}

async function revokeApiKey() {
  if (!confirm('确定要撤销当前的 API Key 吗？撤销后所有使用此 Key 的外部调用将失效。')) return

  loadingApiKey.value = true
  try {
    const { data: { session } } = await client.auth.getSession()
    const headers: Record<string, string> = {}
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`

    await $fetch('/api/auth/apikey', {
      method: 'DELETE',
      headers,
    })
    apiKey.value = ''
    newApiKeyInput.value = ''
    if (user.value) {
      user.value.user_metadata = { ...user.value.user_metadata, api_key: null }
    }
    toast.add({ title: 'API Key 已撤销', color: 'success' })
  }
  catch (e: any) {
    toast.add({ title: '撤销失败', description: e.message, color: 'error' })
  }
  finally {
    loadingApiKey.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <p class="text-sm text-gray-500 dark:text-gray-400">
      使用此 Token 可以通过外部工具（如快捷指令、Cron Job）调用 API，无需登录。
    </p>

    <div v-if="!apiKey" class="flex flex-col items-center justify-center py-4 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg">
      <p class="text-sm text-gray-500 mb-3">
        您尚未设置 API Key
      </p>
      <button
        :disabled="loadingApiKey"
        class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
        @click="generateApiKey"
      >
        <Icon v-if="loadingApiKey" icon="line-md:loading-twotone-loop" class="w-4 h-4" />
        <Icon v-else icon="heroicons:sparkles" class="w-4 h-4" />
        随机生成
      </button>
    </div>

    <div v-else class="space-y-3">
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300">API Key</label>
      <div class="flex gap-2">
        <div class="relative flex-1">
          <input
            :value="apiKey"
            readonly
            :type="showApiKey ? 'text' : 'password'"
            class="block w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 sm:text-sm font-mono"
          />
          <button
            class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            @click.prevent="showApiKey = !showApiKey"
          >
            <Icon :icon="showApiKey ? 'heroicons:eye-slash' : 'heroicons:eye'" class="w-4 h-4" />
          </button>
        </div>
        <button
          class="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          title="复制"
          @click.prevent="copyApiKey"
        >
          <Icon icon="heroicons:clipboard" class="w-5 h-5" />
        </button>
        <button
          class="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          title="撤销 Key"
          @click="revokeApiKey"
        >
          <Icon icon="heroicons:trash" class="w-5 h-5" />
        </button>
      </div>
      <p class="text-xs text-gray-500 mt-2">
        用法: Header <code>x-api-key: YOUR_TOKEN</code> 或 Query <code>?api_key=YOUR_TOKEN</code>
      </p>
    </div>
  </div>
</template>
