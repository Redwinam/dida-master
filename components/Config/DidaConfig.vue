<script setup lang="ts">
import { Icon } from '@iconify/vue'
import Modal from '@/components/ui/Modal.vue'

const { config } = useUserConfig()
const toast = useToast()

const projects = ref<any[]>([])
const fetchingProjects = ref(false)
const showTargetModal = ref(false)
const showWeeklyTargetModal = ref(false)
const showExcludeModal = ref(false)

async function fetchProjects() {
  if (!config.value.dida_token) return
  if (projects.value.length > 0) return // Already fetched
  
  fetchingProjects.value = true
  try {
    const data: any = await $fetch('/api/dida/projects', {
      params: { token: config.value.dida_token }
    })
    projects.value = data || []
  } catch (e) {
    console.error('Failed to fetch projects', e)
    toast.add({ title: '获取项目列表失败', description: '请检查Token是否过期', color: 'error' })
  } finally {
    fetchingProjects.value = false
  }
}

function openTargetModal() {
  showTargetModal.value = true
  fetchProjects()
}

function openWeeklyTargetModal() {
  showWeeklyTargetModal.value = true
  fetchProjects()
}

function openExcludeModal() {
  showExcludeModal.value = true
  fetchProjects()
}

function selectTarget(p: any) {
  config.value.dida_project_id = p.id
  config.value.dida_project_name = p.name
  showTargetModal.value = false
}

function selectWeeklyTarget(p: any) {
  config.value.weekly_report_project_id = p.id
  config.value.weekly_report_project_name = p.name
  showWeeklyTargetModal.value = false
}

// Excluded Projects Logic
const excludedProjects = computed({
  get: () => {
    if (!config.value.exclude_project_name) return []
    return config.value.exclude_project_name
      .split(',')
      .map(s => s.trim().replace(/^"|"$/g, ''))
      .filter(Boolean)
  },
  set: (val) => {
    config.value.exclude_project_name = val.map(s => `"${s}"`).join(',')
  }
})

// Display logic: Exclude the target project from the list shown in the main UI box
const displayExcludedProjects = computed(() => {
    return excludedProjects.value.filter(p => {
        // We can't easily filter by ID here since excludedProjects is names.
        // But we can filter by current target project name if available.
        return p !== config.value.dida_project_name
    })
})

function toggleExcludedProject(name: string) {
  const list = excludedProjects.value
  const index = list.indexOf(name)
  if (index === -1) {
    excludedProjects.value = [...list, name]
  } else {
    excludedProjects.value = list.filter(n => n !== name)
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
      <h4 class="font-medium text-gray-900 dark:text-white flex items-center gap-2">
        <Icon icon="heroicons:list-bullet" class="w-5 h-5 text-indigo-500" />
        滴答清单 (Dida/TickTick)
      </h4>
    </div>

    <div class="space-y-4">
      <!-- Connection Status -->
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">连接状态</label>
        <div v-if="!config.dida_token" class="flex">
          <a href="/api/auth/dida/authorize" class="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200">
            <Icon icon="heroicons:link" class="w-5 h-5 mr-2" />
            点击连接滴答清单
          </a>
        </div>
        <div v-else class="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-800">
          <div class="flex items-center gap-2 text-green-700 dark:text-green-400">
            <Icon icon="heroicons:check-circle" class="w-5 h-5" />
            <span class="text-sm font-medium">已连接</span>
          </div>
          <button @click="config.dida_token = ''" class="text-xs text-gray-500 hover:text-red-500 underline">断开连接</button>
        </div>
      </div>

      <div v-if="config.dida_token" class="space-y-4 animate-fade-in">
        <!-- Target Project -->
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
            目标项目 (用于生成日记，将自动从来源中排除)
          </label>
          <div class="flex items-center gap-3">
            <div class="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Icon icon="heroicons:folder" class="w-4 h-4 text-gray-400" />
              <span v-if="config.dida_project_name">{{ config.dida_project_name }}</span>
              <span v-else-if="config.dida_project_id" class="font-mono text-xs">{{ config.dida_project_id }}</span>
              <span v-else class="text-gray-400 italic">未选择</span>
            </div>
            <button 
              @click="openTargetModal"
              class="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              选择
            </button>
          </div>
        </div>

        <!-- Excluded Projects -->
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">排除项目</label>
          <div class="flex items-start gap-3">
             <div class="flex-1 p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm min-h-[42px]">
                <div v-if="displayExcludedProjects.length > 0" class="flex flex-wrap gap-2">
                  <span v-for="p in displayExcludedProjects" :key="p" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
                    {{ p }}
                  </span>
                </div>
                <span v-else class="text-gray-400 italic">无排除项目</span>
             </div>
             <button 
              @click="openExcludeModal"
              class="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              编辑
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Target Project Modal -->
    <Modal v-model="showTargetModal" title="选择目标项目">
      <div v-if="fetchingProjects" class="flex justify-center py-8">
        <Icon icon="line-md:loading-twotone-loop" class="w-8 h-8 text-indigo-500" />
      </div>
      <div v-else class="max-h-60 overflow-y-auto space-y-1 p-1">
        <button 
          v-for="p in projects" 
          :key="p.id"
          @click="selectTarget(p)"
          class="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
          :class="{'bg-indigo-50 dark:bg-indigo-900/20': config.dida_project_id === p.id}"
        >
          <span class="text-sm text-gray-900 dark:text-white">{{ p.name }}</span>
          <Icon v-if="config.dida_project_id === p.id" icon="heroicons:check" class="w-4 h-4 text-indigo-600" />
        </button>
        <div v-if="projects.length === 0" class="text-center py-4 text-gray-500">
          未找到项目
        </div>
      </div>
      <div class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
         <button @click="showTargetModal = false" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors">
            取消
         </button>
      </div>
    </Modal>

    <!-- Exclude Project Modal -->
    <Modal v-model="showExcludeModal" title="选择排除项目">
       <div v-if="fetchingProjects" class="flex justify-center py-8">
        <Icon icon="line-md:loading-twotone-loop" class="w-8 h-8 text-indigo-500" />
      </div>
      <div v-else class="max-h-60 overflow-y-auto space-y-2 p-1">
        <label v-for="p in projects" :key="p.id" class="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer">
            <input 
                type="checkbox" 
                :checked="excludedProjects.includes(p.name) || p.id === config.dida_project_id"
                :disabled="p.id === config.dida_project_id"
                @change="toggleExcludedProject(p.name)"
                class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-colors w-4 h-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
            <span class="text-sm text-gray-700 dark:text-gray-300" :class="{'text-gray-500': p.id === config.dida_project_id}">
                {{ p.name }}
                <span v-if="p.id === config.dida_project_id" class="text-xs text-indigo-500 ml-1">(自动排除)</span>
            </span>
        </label>
         <div v-if="projects.length === 0" class="text-center py-4 text-gray-500">
          未找到项目
        </div>
      </div>
      <div class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
         <button @click="showExcludeModal = false" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
            完成
         </button>
      </div>
    </Modal>
  </div>
</template>
