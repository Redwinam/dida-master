<script setup lang="ts">
import { Icon } from '@iconify/vue'

const { $supabase } = useNuxtApp()
const client = $supabase as any
const toast = useToast()

const loading = ref(false)
const saving = ref(false)

const serviceKeys = ref<any[]>([])
const llmConfigs = ref<any[]>([])
const mappings = ref<any[]>([])

const serviceNameMap: Record<string, string> = {
  'DIDA_DAILY_NOTE': '日报生成',
  'DIDA_WEEKLY_REPORT': '周报生成',
  'DIDA_TEXT_TO_CALENDAR': '文本转日程',
  'DIDA_IMAGE_TO_CALENDAR': '图片转日程'
}

function getServiceName(key: string) {
  return serviceNameMap[key] || key
}

type ServiceGroup = '文字服务' | '图片服务'
type ServiceKey = keyof typeof serviceNameMap

const serviceGroups: { name: ServiceGroup; keys: ServiceKey[] }[] = [
  { name: '文字服务', keys: ['DIDA_DAILY_NOTE', 'DIDA_WEEKLY_REPORT', 'DIDA_TEXT_TO_CALENDAR'] },
  { name: '图片服务', keys: ['DIDA_IMAGE_TO_CALENDAR'] }
]

const groupedServices = computed(() => {
  const map = new Map(serviceKeys.value.map((sk: any) => [sk.service_key, sk]))
  const groups: Record<ServiceGroup, any[]> = {
    '文字服务': [],
    '图片服务': []
  }
  serviceGroups.forEach((group) => {
    groups[group.name] = group.keys
      .map((key) => map.get(key))
      .filter(Boolean)
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
    mappings.value = (res.mappings || []).map((m: any) => ({
      ...m,
      llm_config_id: m.llm_config_id || '',
      model_name: m.model_name || ''
    }))
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
  } catch (e: any) {
    toast.add({ title: '保存失败', description: e.message, color: 'error' })
    throw e
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

defineExpose({
  saveMappings
})
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-5">
      <p class="text-xs text-gray-500 dark:text-gray-400">
        为不同的服务指定特定的 AI 模型配置。留空则自动使用系统默认配置。
      </p>
      
      <div v-if="loading" class="text-center py-4 text-gray-500">
        <Icon icon="eos-icons:loading" class="w-6 h-6 animate-spin mx-auto mb-2" />
        加载配置中...
      </div>

      <div v-else class="space-y-6">
        <div v-for="(keys, groupName) in groupedServices" :key="groupName" class="space-y-3">
          <div v-if="keys.length > 0">
             <h5 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">
                {{ groupName }}
             </h5>
             <div class="space-y-3">
                <div v-for="sk in keys" :key="sk.service_key" class="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-all hover:border-primary-300 dark:hover:border-primary-700">
                   <div class="flex flex-col md:flex-row items-center gap-3">
                      <!-- Top: Service Info -->
                      <div class="w-full">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="text-sm font-semibold text-gray-900 dark:text-white">
                            {{ getServiceName(sk.service_key) }}
                          </span>
                          <span class="text-xs text-gray-400 font-mono">
                            {{ sk.service_key }}
                          </span>
                        </div>
                        <p v-if="sk.description" class="text-xs text-gray-500 dark:text-gray-400 mt-1" :title="sk.description">
                          {{ sk.description }}
                        </p>
                      </div>
                   
                      <!-- Bottom: Configs -->
                      <div class="flex flex-col sm:flex-row gap-3 w-full">
                        <!-- Config Selection -->
                        <div class="w-full sm:flex-1">
                          <select 
                            :value="getMapping(sk.service_key).llm_config_id"
                            @change="(e: any) => updateMapping(sk.service_key, 'llm_config_id', e.target.value)"
                            class="block w-full py-1.5 pl-3 pr-8 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500 transition-colors"
                          >
                            <option value="">默认配置 (自动)</option>
                            <option v-for="config in llmConfigs" :key="config.id" :value="config.id">
                              {{ config.name }}
                            </option>
                          </select>
                        </div>

                        <!-- Model Selection -->
                        <div class="w-full sm:flex-1">
                           <select
                             :value="getMapping(sk.service_key).model_name"
                             @change="(e: any) => updateMapping(sk.service_key, 'model_name', e.target.value)"
                             :disabled="!getMapping(sk.service_key).llm_config_id"
                             class="block w-full py-1.5 pl-3 pr-8 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                           >
                             <option value="">默认模型 (自动)</option>
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
        </div>
        
      </div>
    </div>

  </div>
</template>
