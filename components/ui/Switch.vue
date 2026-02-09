<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'

const props = withDefaults(defineProps<{
  modelValue: boolean
  disabled?: boolean
  color?: string
}>(), {
  disabled: false,
  color: 'primary',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const checked = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
})

const colorClasses = computed(() => {
  const colors: Record<string, string> = {
    primary: 'data-[state=checked]:bg-primary-600',
    teal: 'data-[state=checked]:bg-teal-600',
    green: 'data-[state=checked]:bg-green-600',
    amber: 'data-[state=checked]:bg-amber-600',
  }
  return colors[props.color] || colors.primary
})
</script>

<template>
  <SwitchRoot
    v-model:checked="checked"
    :disabled="disabled"
    :class="[
      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900',
      'data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-gray-700',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      colorClasses,
    ]"
  >
    <SwitchThumb
      class="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
    />
  </SwitchRoot>
</template>
