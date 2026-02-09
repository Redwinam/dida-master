<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  VisuallyHidden,
} from 'reka-ui'

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

const open = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
})
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out"
      />

      <DialogContent
        :class="[
          'fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] sm:w-[calc(100%-3rem)] rounded-2xl bg-white dark:bg-gray-800 overflow-hidden text-left shadow-xl border border-gray-100 dark:border-gray-700',
          'data-[state=open]:animate-scale-in data-[state=closed]:animate-scale-out',
          maxWidth || 'max-w-lg',
          padding ? 'p-6' : '',
        ]"
      >
        <!-- Hidden description for accessibility -->
        <DialogDescription class="sr-only">
          {{ title }}
        </DialogDescription>

        <div v-if="props.showHeader" class="flex items-center justify-between mb-5">
          <DialogTitle class="text-lg font-semibold leading-6 text-gray-900 dark:text-white">
            {{ title }}
          </DialogTitle>
          <DialogClose class="rounded-lg p-1.5 text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-colors">
            <Icon name="lucide:x" class="w-5 h-5" />
          </DialogClose>
        </div>
        <VisuallyHidden v-else as-child>
          <DialogTitle>{{ title }}</DialogTitle>
        </VisuallyHidden>

        <slot></slot>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
