<script setup lang="ts">
import { Icon } from '@iconify/vue'

defineProps<{
  modelValue: boolean
  title: string
}>()

const emit = defineEmits(['update:modelValue'])

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" @click="close"></div>

      <!-- Modal Panel -->
      <div class="relative w-full max-w-lg transform rounded-2xl bg-white dark:bg-gray-800 p-6 text-left shadow-xl transition-all border border-gray-100 dark:border-gray-700">
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-lg font-semibold leading-6 text-gray-900 dark:text-white">
            {{ title }}
          </h3>
          <button @click="close" class="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors">
            <Icon icon="heroicons:x-mark" class="w-5 h-5" />
          </button>
        </div>
        
        <div class="mt-2">
          <slot></slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>
