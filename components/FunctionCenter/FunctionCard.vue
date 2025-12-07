<script setup lang="ts">
import { Icon } from '@iconify/vue'
import Modal from '@/components/ui/Modal.vue'

const props = defineProps<{
  title: string
  description: string
  icon: string
  colorClass: string // e.g. text-indigo-600
  bgClass: string // e.g. bg-indigo-100
  apiGuide?: {
    endpoint: string
    method: string
    description: string
    params?: Record<string, string>
    example?: string
  }
}>()

const showApiModal = ref(false)
</script>

<template>
  <div class="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all duration-300 h-full flex flex-col">
    <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
      <Icon :icon="icon" class="w-48 h-48" :class="colorClass" />
    </div>
    
    <div class="p-6 relative z-10 flex flex-col h-full">
      <div class="flex justify-between items-start mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <div class="p-2 rounded-lg" :class="[bgClass, colorClass]">
            <Icon :icon="icon" class="w-6 h-6" />
          </div>
          {{ title }}
        </h3>
        <button 
          v-if="apiGuide"
          @click="showApiModal = true"
          class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="API 使用说明"
        >
          <Icon icon="heroicons:code-bracket" class="w-4 h-4" />
          API
        </button>
      </div>

      <p class="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed grow">
        {{ description }}
      </p>
      
      <div class="mt-auto">
        <slot></slot>
      </div>
    </div>

    <!-- API Guide Modal -->
    <Modal v-if="apiGuide" v-model="showApiModal" :title="`${title} - API Guide`">
      <div class="space-y-4 text-sm text-gray-700 dark:text-gray-300">
        <p>{{ apiGuide.description }}</p>
        
        <div class="space-y-2">
            <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 font-mono text-xs font-bold">{{ apiGuide.method }}</span>
                <code class="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">{{ apiGuide.endpoint }}</code>
            </div>
        </div>

        <div v-if="apiGuide.params" class="space-y-2">
            <h5 class="font-medium text-gray-900 dark:text-white">Parameters</h5>
            <ul class="list-disc pl-5 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <li v-for="(desc, name) in apiGuide.params" :key="name">
                    <code class="font-bold">{{ name }}</code>: {{ desc }}
                </li>
            </ul>
        </div>

        <div v-if="apiGuide.example" class="space-y-2">
            <h5 class="font-medium text-gray-900 dark:text-white">Example (cURL)</h5>
            <pre class="bg-gray-900 text-gray-200 p-3 rounded-lg overflow-x-auto text-xs font-mono whitespace-pre-wrap">{{ apiGuide.example }}</pre>
        </div>
      </div>
    </Modal>
  </div>
</template>
