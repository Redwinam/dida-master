<script setup lang="ts">
import MarkdownIt from 'markdown-it'

definePageMeta({
  middleware: 'auth',
})

const md = new MarkdownIt()
const { $supabase } = useNuxtApp()
const client = $supabase as any

const route = useRoute()
const router = useRouter()
const page = ref(parseInt(route.query.page as string) || 1)
const pageSize = ref(10)
const { data, pending, refresh } = await useFetch('/api/dida/daily-notes', {
  query: { page, pageSize },
  onRequest: async ({ options }) => {
    const { data: { session } } = await client.auth.getSession()
    if (session?.access_token) {
      options.headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${session.access_token}`,
      } as any
    }
  },
})

const selectedNote = ref<any>(null)
const isModalOpen = ref(false)
const detailLoading = ref(false)

async function openNote(note: any) {
  isModalOpen.value = true
  detailLoading.value = true
  selectedNote.value = { title: note.title, content: null }

  try {
    const { data: { session } } = await client.auth.getSession()
    const detail = await $fetch(`/api/dida/daily-notes/${note.id}`, {
      headers: {
        Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
      },
    }) as any

    // If we got a CDN URL instead of content, fetch from CDN
    if (detail.cdn_url && !detail.content) {
      const res = await fetch(detail.cdn_url)
      const cosData = await res.json()
      selectedNote.value = { ...detail, content: cosData.content || '' }
    }
    else {
      selectedNote.value = detail
    }
  }
  catch (e) {
    console.error('Failed to load note detail:', e)
    selectedNote.value = { ...note, content: '加载内容失败，请重试。' }
  }
  finally {
    detailLoading.value = false
  }
}

function onPageChange(newPage: number) {
  page.value = newPage
  router.push({ query: { ...route.query, page: newPage } })
}

watch(() => route.query.page, newPage => {
  if (newPage) {
    page.value = parseInt(newPage as string)
  }
})
</script>

<template>
  <div class="min-h-screen p-4 md:p-8 bg-gradient-to-br from-gray-50 via-primary-50/20 to-accent-50/10 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
    <div class="max-w-5xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8 mt-4">
        <div class="flex items-center gap-4">
          <NuxtLink to="/" class="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
            <Icon name="heroicons:arrow-left" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </NuxtLink>
          <div>
            <h1 class="text-xl font-bold text-gray-900 dark:text-white">
              每日笔记历史
            </h1>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">查看与管理过往的每日笔记</p>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white/70 dark:bg-gray-800/60 backdrop-blur-md rounded-2xl shadow-sm border border-white/80 dark:border-gray-700/60 overflow-hidden">
        <!-- Loading State -->
        <div v-if="pending" class="flex flex-col items-center justify-center py-20">
          <div class="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-full mb-4">
            <Icon name="line-md:loading-twotone-loop" class="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 font-medium">
            正在加载...
          </p>
        </div>

        <!-- Empty State -->
        <div v-else-if="!data?.data || data.data.length === 0" class="flex flex-col items-center justify-center py-20">
          <div class="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-full mb-4">
            <Icon name="heroicons:document-text" class="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <p class="text-gray-900 dark:text-white font-semibold">
            暂无数据
          </p>
          <p class="text-sm text-gray-400 dark:text-gray-500 mt-1 mb-5">
            还没有生成过每日笔记
          </p>
          <NuxtLink to="/" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors">
            回到首页
          </NuxtLink>
        </div>

        <!-- Data -->
        <div v-else>
          <table class="w-full text-left">
            <thead class="bg-gray-50/80 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th class="px-6 py-3.5">
                  日期
                </th>
                <th class="px-6 py-3.5">
                  标题
                </th>
                <th class="px-6 py-3.5 text-right">
                  操作
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50 dark:divide-gray-700/50">
              <tr
                v-for="note in data.data"
                :key="note.id"
                class="group hover:bg-primary-50/40 dark:hover:bg-primary-900/10 transition-colors relative"
              >
                <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {{ new Date(note.note_date).toLocaleDateString('zh-CN') }}
                </td>
                <td class="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">
                  {{ note.title }}
                </td>
                <td class="px-6 py-4 text-right">
                  <button
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                    @click="openNote(note)"
                  >
                    <Icon name="heroicons:eye" class="w-3.5 h-3.5" />
                    查看
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Pagination -->
          <div class="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <div class="text-xs text-gray-400 dark:text-gray-500">
              共 {{ data.total }} 条
            </div>
            <div class="flex items-center gap-1">
              <button
                :disabled="page <= 1"
                class="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                @click="onPageChange(page - 1)"
              >
                <Icon name="heroicons:chevron-left" class="w-4 h-4" />
              </button>
              <span class="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[2rem] text-center">{{ page }}</span>
              <button
                :disabled="page * pageSize >= data.total"
                class="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                @click="onPageChange(page + 1)"
              >
                <Icon name="heroicons:chevron-right" class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <UiModal v-model="isModalOpen" :title="selectedNote?.title || '详情'" max-width="max-w-4xl">
      <div class="max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
        <div v-if="detailLoading" class="flex items-center justify-center py-12">
          <Icon name="line-md:loading-twotone-loop" class="w-8 h-8 text-primary-600 dark:text-primary-400" />
        </div>
        <div
          v-else-if="selectedNote"
          class="prose dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300"
          v-html="md.render(selectedNote.content || '')"
        ></div>
      </div>
      <div class="mt-6 flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
        <button
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
          @click="isModalOpen = false"
        >
          关闭
        </button>
      </div>
    </UiModal>
  </div>
</template>
