<script setup lang="ts">
import { Icon } from '@iconify/vue'
import ApiKeyManager from './ApiKeyManager.vue'

const { $supabase } = useNuxtApp()
const client = $supabase as any
const toast = useToast()

const loading = ref(false)
const saving = ref(false)

const serviceKeys = ref<any[]>([])
const llmConfigs = ref<any[]>([])
const mappings = ref<any[]>([])

type ServiceGroup = '文字服务' | '图片服务' | '其他'

const groupedServices = computed(() => {
  const groups: Record<ServiceGroup, any[]> = {
    '文字服务': [],
    '图片服务': [],
    '其他': []
  }
  
  serviceKeys.value.forEach((sk: any) => {
    if (!sk?.service_key) return
    if (sk.service_key.includes('IMAGE')) {
      groups['图片服务'].push(sk)
    } else if (sk.service_key.includes('TEXT') || sk.service_key.includes('NOTE') || sk.service_key.includes('REPORT')) {
      groups['文字服务'].push(sk)
    } else {
      groups['其他'].push(sk)
    }
  })
  
  return groups
})

async function fetchData() {
  loading.value = true
  try {
    const { data: { session } } = await client.auth.getSession()
    const headers: Record<string, string> = {}
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`

    const res: any = await $fetch('/api/ai/config', { headers })
    serviceKeys.value = res.serviceKeys || []
    llmConfigs.value = res.llmConfigs || []
    mappings.value = res.mappings || []
  } catch (e: any) {
    toast.add({ title: '加载配置失败', description: e.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

function getMapping(serviceKey: string) {
  return mappings.value.find(m => m.service_key === serviceKey) || {}
}

function updateMapping(serviceKey: string, field: 'llm_config_id' | 'model_name', value: any) {
  const idx = mappings.value.findIndex(m => m.service_key === serviceKey)
  if (idx > -1) {
    mappings.value[idx][field] = value
    // Reset model if config changes
    if (field === 'llm_config_id') {
      const config = llmConfigs.value.find(c => c.id === value)
      if (config && config.models && config.models.length > 0) {
         mappings.value[idx].model_name = config.models[0]
      } else {
         mappings.value[idx].model_name = ''
      }
    }
  } else {
    const newMapping: any = { service_key: serviceKey }
    newMapping[field] = value
     if (field === 'llm_config_id') {
      const config = llmConfigs.value.find(c => c.id === value)
      if (config && config.models && config.models.length > 0) {
         newMapping.model_name = config.models[0]
      }
    }
    mappings.value.push(newMapping)
  }
}

async function saveMappings() {
  saving.value = true
  try {
    const { data: { session } } = await client.auth.getSession()
    const headers: Record<string, string> = {}
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`

    await $fetch('/api/ai/config', {
      method: 'POST',
      headers,
      body: { mappings: mappings.value }
    })
    toast.add({ title: '保存成功', color: 'success' })
  } catch (e: any) {
    toast.add({ title: '保存失败', description: e.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

function getModelsForConfig(configId: string) {
  const config = llmConfigs.value.find(c => c.id === configId)
  return config?.models || []
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-5">
      <h4 class="font-medium text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
        <Icon icon="heroicons:cpu-chip" class="w-5 h-5 text-purple-500" />
        AI 服务映射配置
      </h4>
      
      <div v-if="loading" class="text-center py-4 text-gray-500">
        <Icon icon="eos-icons:loading" class="w-6 h-6 animate-spin mx-auto mb-2" />
        加载配置中...
      </div>

      <div v-else class="space-y-6">
        <div v-for="(keys, groupName) in groupedServices" :key="groupName" class="space-y-3">
          <div v-if="keys.length > 0">
             <h5 class="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                {{ groupName }}
             </h5>
             <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-for="sk in keys" :key="sk.service_key" class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                   <div class="flex items-center justify-between mb-2">
                      <span class="text-sm font-medium text-gray-900 dark:text-white" :title="sk.description">{{ sk.label || sk.service_key }}</span>
                      <span class="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">{{ sk.service_key }}</span>
                   </div>
                   
                   <div class="space-y-3">
                      <!-- Config Selection -->
                      <div>
                        <label class="block text-xs font-medium text-gray-500 mb-1">选择 AI 配置</label>
                        <select 
                          :value="getMapping(sk.service_key).llm_config_id"
                          @change="(e: any) => updateMapping(sk.service_key, 'llm_config_id', e.target.value)"
                          class="block w-full py-1.5 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="" disabled>请选择配置</option>
                          <option v-for="config in llmConfigs" :key="config.id" :value="config.id">
                            {{ config.name }}
                          </option>
                        </select>
                      </div>

                      <!-- Model Selection -->
                      <div v-if="getMapping(sk.service_key).llm_config_id">
                         <label class="block text-xs font-medium text-gray-500 mb-1">选择模型</label>
                         <select
                           :value="getMapping(sk.service_key).model_name"
                           @change="(e: any) => updateMapping(sk.service_key, 'model_name', e.target.value)"
                           class="block w-full py-1.5 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                         >
                           <option value="" disabled>请选择模型</option>
                           <option v-for="model in getModelsForConfig(getMapping(sk.service_key).llm_config_id)" :key="model" :value="model">
                             {{ model }}
                           </option>
                         </select>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
        
        <div class="flex justify-end pt-4">
           <button 
             @click="saveMappings" 
             :disabled="saving"
             class="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
           >
             <Icon v-if="saving" icon="eos-icons:loading" class="w-4 h-4 animate-spin" />
             <Icon v-else icon="heroicons:check" class="w-4 h-4" />
             保存映射配置
           </button>
        </div>
      </div>
    </div>

    <ApiKeyManager />
  </div>
</template>
