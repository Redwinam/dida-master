<script setup lang="ts">
import { Icon } from '@iconify/vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  title: string
  maxWidth?: string
  showHeader?: boolean
  padding?: boolean
}>(), {
  showHeader: true,
  padding: true,
})

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
      <div
        :class="[
          'relative w-full transform rounded-2xl bg-white dark:bg-gray-800 overflow-hidden text-left shadow-xl transition-all border border-gray-100 dark:border-gray-700',
          maxWidth || 'max-w-lg',
          padding ? 'p-6' : '',
        ]"
      >
        <div v-if="props.showHeader" class="flex items-center justify-between mb-5">
          <h3 class="text-lg font-semibold leading-6 text-gray-900 dark:text-white">
            {{ title }}
          </h3>
          <button class="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors" @click="close">
            <Icon icon="heroicons:x-mark" class="w-5 h-5" />
          </button>
        </div>

        <slot></slot>
      </div>
    </div>
  </Teleport>
</template>
