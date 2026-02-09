<script setup lang="ts">
import {
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'

const props = withDefaults(defineProps<{
  modelValue: string
  options: { label: string, value: string }[]
  placeholder?: string
  disabled?: boolean
  size?: 'sm' | 'md'
  accentColor?: string
}>(), {
  placeholder: '请选择',
  disabled: false,
  size: 'md',
  accentColor: 'primary',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const value = computed({
  get: () => props.modelValue,
  set: (val: string) => emit('update:modelValue', val),
})

const sizeClasses = computed(() => {
  return props.size === 'sm'
    ? 'py-1.5 pl-3 pr-2 text-xs'
    : 'px-3 py-2 text-sm'
})

const itemSizeClasses = computed(() => {
  return props.size === 'sm'
    ? 'px-3 py-1.5 text-xs'
    : 'px-3 py-2 text-sm'
})

const indicatorSize = computed(() => {
  return props.size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
})

const chevronSize = computed(() => {
  return props.size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
})
</script>

<template>
  <SelectRoot v-model="value" :disabled="disabled">
    <SelectTrigger
      :class="[
        'inline-flex items-center justify-between w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white transition-colors',
        'focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        sizeClasses,
      ]"
    >
      <SelectValue :placeholder="placeholder" />
      <SelectIcon>
        <Icon name="heroicons:chevron-down" :class="['text-gray-400', chevronSize]" />
      </SelectIcon>
    </SelectTrigger>
    <SelectPortal>
      <SelectContent
        class="z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden data-[state=open]:animate-slide-in-from-top data-[state=closed]:animate-slide-out-to-top"
        position="popper"
        :side-offset="4"
      >
        <SelectViewport class="p-1 max-h-48">
          <SelectItem
            v-for="option in options"
            :key="option.value"
            :value="option.value"
            :class="[
              'relative flex items-center rounded-md text-gray-900 dark:text-white cursor-pointer select-none',
              'hover:bg-gray-100 dark:hover:bg-gray-700 data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-700 outline-none',
              itemSizeClasses,
            ]"
          >
            <SelectItemText>{{ option.label }}</SelectItemText>
            <SelectItemIndicator class="absolute right-2">
              <Icon
                name="heroicons:check"
                :class="[indicatorSize, `text-${accentColor}-600`]"
              />
            </SelectItemIndicator>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
