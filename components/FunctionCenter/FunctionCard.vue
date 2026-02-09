<script setup lang="ts">
import UiSelect from '@/components/ui/Select.vue'
import Modal from '@/components/ui/Modal.vue'

const props = withDefaults(defineProps<{
  title: string
  description: string
  icon: string
  colorClass: string // e.g. text-primary-600
  bgClass: string // e.g. bg-primary-100
  gradientFrom?: string // e.g. from-primary-500
  gradientTo?: string // e.g. to-primary-300
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
  gradientFrom: 'from-primary-500',
  gradientTo: 'to-primary-300',
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
  <div class="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 h-full flex flex-col">
    <!-- Colored gradient top bar -->
    <div class="h-1 bg-gradient-to-r" :class="[gradientFrom, gradientTo]"></div>

    <!-- Background watermark icon -->
    <div class="absolute -top-4 -right-4 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity duration-500 pointer-events-none">
      <Icon :name="icon" class="w-44 h-44" :class="colorClass" />
    </div>

    <div class="p-6 relative z-10 flex flex-col h-full">
      <div class="flex justify-between items-start mb-4">
        <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-gradient-to-br shadow-sm" :class="[bgClass, colorClass]">
            <Icon :name="icon" class="w-5 h-5" />
          </div>
          {{ title }}
        </h3>
        <button
          v-if="apiGuide"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 bg-gray-50 dark:bg-gray-700/50 hover:bg-primary-50 dark:hover:bg-primary-900/30 border border-gray-200 dark:border-gray-600 hover:border-primary-200 dark:hover:border-primary-700 transition-all"
          title="API 使用说明"
          @click="showApiModal = true"
        >
          <Icon name="heroicons:code-bracket" class="w-3 h-3" />
          API
        </button>
      </div>

      <p class="text-gray-500 dark:text-gray-400 text-sm leading-relaxed grow">
        {{ description }}
      </p>

      <!-- Separator -->
      <div class="my-4 border-t border-gray-100 dark:border-gray-700/50"></div>

      <div class="mt-auto">
        <div v-if="missingConfig" class="flex flex-col gap-3">
          <div class="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-sm rounded-lg flex items-start gap-2">
            <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 shrink-0 mt-0.5" />
            <span>{{ missingConfigText || '功能未配置，请先完成配置。' }}</span>
          </div>
          <button
            class="w-full py-2.5 px-4 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-lg text-sm font-medium shadow-sm transition-all flex justify-center items-center gap-2"
            @click="$emit('configure')"
          >
            <Icon name="heroicons:cog-6-tooth" class="w-5 h-5" />
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
