<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const statusCode = computed(() => props.error.statusCode || 500)

const errorConfig = computed(() => {
  const configs: Record<number, { title: string, description: string, icon: string, iconColor: string }> = {
    404: {
      title: '迷路了',
      description: '你所寻找的页面似乎已不在此处，或者从未存在过。',
      icon: 'lucide:compass',
      iconColor: 'text-accent-400',
    },
    403: {
      title: '禁止访问',
      description: '你没有权限访问此页面。',
      icon: 'lucide:shield-off',
      iconColor: 'text-amber-400',
    },
    500: {
      title: '服务异常',
      description: '服务器遇到了一些问题，请稍后重试。',
      icon: 'lucide:server-crash',
      iconColor: 'text-red-400',
    },
  }

  return configs[statusCode.value] || {
    title: '发生错误',
    description: props.error.message || '出了点问题，请稍后再试。',
    icon: 'lucide:alert-triangle',
    iconColor: 'text-amber-400',
  }
})

const handleError = () => clearError({ redirect: '/' })
const handleBack = () => {
  if (window.history.length > 1) {
    window.history.back()
  }
  else {
    clearError({ redirect: '/' })
  }
}
</script>

<template>
  <div class="error-page relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 p-4">
    <!-- Decorative floating orbs (same as login for consistency) -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="orb orb-1" />
      <div class="orb orb-2" />
      <div class="orb orb-3" />
    </div>

    <!-- Subtle grid pattern overlay -->
    <div class="absolute inset-0 opacity-[0.03] pointer-events-none" style="background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0); background-size: 40px 40px;" />

    <!-- Main content -->
    <div class="relative z-10 w-full max-w-lg text-center animate-content-in">
      <!-- Error code - big display -->
      <div class="relative mb-6">
        <span class="text-[120px] md:text-[160px] font-black leading-none text-white/[0.04] select-none">
          {{ statusCode }}
        </span>
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="p-5 rounded-3xl bg-white/[0.07] backdrop-blur-sm border border-white/[0.12] shadow-xl">
            <Icon :name="errorConfig.icon" class="w-14 h-14" :class="errorConfig.iconColor" />
          </div>
        </div>
      </div>

      <!-- Title & Description -->
      <h1 class="text-3xl md:text-4xl font-black text-white mb-3 tracking-tight">
        {{ errorConfig.title }}
      </h1>
      <p class="text-primary-300/70 text-sm md:text-base mb-2 max-w-md mx-auto leading-relaxed">
        {{ errorConfig.description }}
      </p>
      <p class="text-primary-400/40 text-xs mb-8 font-mono">
        错误代码：{{ statusCode }}
      </p>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-3 justify-center items-center">
        <button
          class="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-accent-500 to-accent-400 hover:from-accent-400 hover:to-accent-300 shadow-lg shadow-accent-500/25 hover:shadow-accent-400/40 transition-all duration-300 active:scale-[0.98]"
          @click="handleError"
        >
          <Icon name="lucide:home" class="w-4.5 h-4.5" />
          返回首页
        </button>
        <button
          class="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-primary-200/80 bg-white/[0.07] border border-white/[0.12] hover:bg-white/[0.12] hover:text-white transition-all duration-300 active:scale-[0.98]"
          @click="handleBack"
        >
          <Icon name="lucide:arrow-left" class="w-4.5 h-4.5" />
          返回上页
        </button>
      </div>

      <!-- Footer -->
      <div class="mt-16">
        <div class="inline-flex items-center gap-3 opacity-40 hover:opacity-60 transition-opacity">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1389.8 1135.4" class="w-6 h-6">
            <path fill="white" d="M1363.4,653.8c-27.2,38.8-71.9,63.4-119.4,63.4h-718.6c-69.3,0-129.3-49.9-143.4-116.9-5.6-26.5-4.5-52.9,3.5-78,20.2-63.9,78.6-104.3,145.1-104.3l715.2.3c67,0,127.5,51.6,140.5,117.5,8,40.5,1.5,83.3-22.7,117.9h-.2Z" />
            <path fill="white" d="M1303.6,285.8c-18.3,8.1-38.4,13.4-58.5,13.4l-715.8.4c-53.3,0-101.8-25.9-129.4-71.7-19-31.5-25.7-68.3-18.9-106.1C392.4,58.5,449.7,1.5,517.2,1.4l732.5-.2c71.5,0,129.9,59.8,138.4,128,4.9,39-3.6,77.3-26.3,108.5-15.2,21-34,37.3-58.3,48.1h0Z" />
            <path fill="white" d="M1382.6,1033.7c-18,58.2-73.3,101.3-134.9,101.3l-723.5.4c-33.4,0-64.8-11.7-90.4-32.1-34.2-27.2-53-65.6-55.4-109.6-4.4-79.4,57.4-155.6,140.1-155.7l730.4-.9c29.9,0,57.9,11.7,81.3,28.7,51.8,37.8,71.5,106.1,52.4,167.8h0Z" />
            <circle fill="#f8867a" cx="149.8" cy="149.8" r="149.8" />
          </svg>
          <span class="text-xs text-primary-300 font-medium">滴答：主人的任务</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
}

.orb-1 {
  width: 350px;
  height: 350px;
  background: radial-gradient(circle, #f8867a33, transparent 70%);
  top: -8%;
  right: -3%;
  animation: float-1 20s ease-in-out infinite;
}

.orb-2 {
  width: 280px;
  height: 280px;
  background: radial-gradient(circle, #4d72b833, transparent 70%);
  bottom: -5%;
  left: -5%;
  animation: float-2 25s ease-in-out infinite;
}

.orb-3 {
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, #f8867a22, transparent 70%);
  top: 40%;
  left: 15%;
  animation: float-3 18s ease-in-out infinite;
}

@keyframes float-1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-30px, 40px) scale(1.1); }
  66% { transform: translate(20px, -20px) scale(0.95); }
}

@keyframes float-2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(40px, -30px) scale(1.05); }
  66% { transform: translate(-20px, 30px) scale(1.1); }
}

@keyframes float-3 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(30px, -40px) scale(1.15); }
}
</style>
