<script setup lang="ts">
import UiSelect from '@/components/ui/Select.vue'
import Modal from '@/components/ui/Modal.vue'

const props = withDefaults(defineProps<{
  title: string
  description: string
  icon: string
  colorClass: string // e.g. text-primary-600
  bgClass: string // e.g. bg-primary-100
  apiGuide?: {
    endpoint: string
    method: string
    description: string
    params?: Record<string, string>
    example?: string
    options?: { label: string, value: string }[]
    optionLabel?: string
    getExample?: (value?: string) => string
  }
  missingConfig?: boolean
  missingConfigText?: string
}>(), {
  missingConfig: false,
  missingConfigText: '',
})

defineEmits<{
  (e: 'configure'): void
}>()

const showApiModal = ref(false)
const selectedApiOption = ref('')

const exampleText = computed(() => {
  if (!props.apiGuide) return ''
  if (props.apiGuide.getExample) {
    return props.apiGuide.getExample(selectedApiOption.value || undefined)
  }
  return props.apiGuide.example || ''
})

watch(
  () => showApiModal.value,
  open => {
    if (!open) return
    const options = props.apiGuide?.options || []
    const firstOption = options[0]
    selectedApiOption.value = firstOption?.value || ''
  },
)
</script>

<template>
  <div class="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all duration-300 h-full flex flex-col">
    <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
      <Icon :name="icon" class="w-48 h-48" :class="colorClass" />
    </div>

    <div class="p-6 relative z-10 flex flex-col h-full">
      <div class="flex justify-between items-start mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <div class="p-2 rounded-lg" :class="[bgClass, colorClass]">
            <Icon :name="icon" class="w-6 h-6" />
          </div>
          {{ title }}
        </h3>
        <button
          v-if="apiGuide"
          class="text-xs text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent dark:border-gray-600 hover:border-primary-200 dark:hover:border-primary-800 transition-all"
          title="API 使用说明"
          @click="showApiModal = true"
        >
          <Icon name="lucide:code" class="w-3.5 h-3.5" />
          API
        </button>
      </div>

      <p class="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed grow">
        {{ description }}
      </p>

      <div class="mt-auto">
        <div v-if="missingConfig" class="flex flex-col gap-3">
          <div class="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-sm rounded-lg flex items-start gap-2">
            <Icon name="lucide:triangle-alert" class="w-5 h-5 shrink-0 mt-0.5" />
            <span>{{ missingConfigText || '功能未配置，请先完成配置。' }}</span>
          </div>
          <button
            class="w-full py-2.5 px-4 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-lg text-sm font-medium shadow-sm transition-all flex justify-center items-center gap-2"
            @click="$emit('configure')"
          >
            <Icon name="lucide:settings" class="w-5 h-5" />
            去配置
          </button>
        </div>
        <slot v-else></slot>
      </div>
    </div>

    <!-- API Guide Modal -->
    <Modal v-if="apiGuide" v-model="showApiModal" :title="`${title} - API 指南`">
      <div class="space-y-4 text-sm text-gray-700 dark:text-gray-300">
        <p>{{ apiGuide.description }}</p>

        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 font-mono text-xs font-bold">{{ apiGuide.method }}</span>
            <code class="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-primary-600 dark:text-primary-400 font-mono">{{ apiGuide.endpoint }}</code>
          </div>
        </div>

        <div v-if="apiGuide.params" class="space-y-2">
          <h5 class="font-medium text-gray-900 dark:text-white">
            参数说明
          </h5>
          <ul class="list-disc pl-5 space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <li v-for="(desc, name) in apiGuide.params" :key="name">
              <code class="font-bold">{{ name }}</code>: {{ desc }}
            </li>
          </ul>
        </div>

        <div v-if="apiGuide.options && apiGuide.options.length > 0" class="space-y-2">
          <h5 class="font-medium text-gray-900 dark:text-white">
            {{ apiGuide.optionLabel || '选择模板' }}
          </h5>
          <UiSelect
            v-model="selectedApiOption"
            :options="apiGuide.options"
            placeholder="请选择"
          />
        </div>

        <div v-if="exampleText" class="space-y-2">
          <h5 class="font-medium text-gray-900 dark:text-white">
            接口示例 (cURL)
          </h5>
          <pre class="bg-gray-900 text-gray-200 p-3 rounded-lg overflow-x-auto text-xs font-mono whitespace-pre-wrap">{{ exampleText }}</pre>
        </div>
      </div>
    </Modal>
  </div>
</template>
