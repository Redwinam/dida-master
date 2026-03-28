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
const deletingId = ref<string | null>(null)

async function deleteNote(note: any) {
  if (!confirm(`确定要删除「${note.title}」吗？此操作不可恢复。`)) return

  deletingId.value = note.id
  try {
    const { data: { session } } = await client.auth.getSession()
    await $fetch(`/api/dida/daily-notes/${note.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
      },
    })
    await refresh()
  }
  catch (e) {
    console.error('Failed to delete note:', e)
    alert('删除失败，请重试。')
  }
  finally {
    deletingId.value = null
  }
}

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
  <div class="min-h-screen transition-colors duration-300 relative overflow-hidden">
    <!-- Background decorative orbs -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <div class="page-orb page-orb-1" />
      <div class="page-orb page-orb-2" />
    </div>

    <!-- Hero Header -->
    <div class="relative z-10 bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 overflow-hidden">
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-accent-400/[0.06] blur-3xl" />
        <div class="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-primary-400/[0.08] blur-3xl" />
      </div>
      <div class="absolute inset-0 opacity-[0.03] pointer-events-none" style="background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0); background-size: 40px 40px;" />

      <div class="max-w-5xl mx-auto px-4 md:px-8 relative z-10 py-8 md:py-10">
        <div class="flex items-center gap-4 animate-content-in">
          <NuxtLink to="/" class="p-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white/70 hover:text-white transition-all">
            <Icon name="lucide:arrow-left" class="w-5 h-5" />
          </NuxtLink>
          <div>
            <h1 class="text-xl md:text-2xl font-bold text-white tracking-tight">
              每日笔记历史
            </h1>
            <p class="text-primary-300/50 text-xs mt-0.5">
              查看和管理所有已生成的每日笔记
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="relative z-10 max-w-5xl mx-auto px-4 md:px-8 -mt-4 pb-16">
      <div class="bg-white dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700/80 overflow-hidden animate-content-in">
        <!-- Loading -->
        <div v-if="pending" class="p-12 text-center">
          <div class="w-12 h-12 mx-auto mb-4 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
            <Icon name="line-md:loading-twotone-loop" class="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 font-medium">加载中...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="!data?.data || data.data.length === 0" class="p-12 text-center">
          <div class="w-12 h-12 mx-auto mb-4 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <Icon name="lucide:inbox" class="w-6 h-6 text-gray-400" />
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 font-medium">暂无数据</p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">生成每日笔记后将显示在这里</p>
        </div>

        <!-- Data Table -->
        <div v-else>
          <table class="w-full text-left">
            <thead class="bg-gray-50/80 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th class="px-6 py-4">
                  日期
                </th>
                <th class="px-6 py-4">
                  标题
                </th>
                <th class="px-6 py-4 text-right">
                  操作
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50 dark:divide-gray-700/50">
              <tr v-for="note in data.data" :key="note.id" class="hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-colors duration-150">
                <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap font-mono">
                  {{ new Date(note.note_date).toLocaleDateString() }}
                </td>
                <td class="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">
                  {{ note.title }}
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 rounded-lg transition-colors"
                      @click="openNote(note)"
                    >
                      <Icon name="lucide:eye" class="w-3.5 h-3.5" />
                      查看
                    </button>
                    <button
                      class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-40"
                      :disabled="deletingId === note.id"
                      @click="deleteNote(note)"
                    >
                      <Icon name="lucide:trash-2" class="w-3.5 h-3.5" />
                      {{ deletingId === note.id ? '...' : '删除' }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Pagination -->
          <div class="px-6 py-4 border-t border-gray-100 dark:border-gray-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/30">
            <div class="text-xs text-gray-500 dark:text-gray-400 font-medium">
              共 {{ data.total }} 条记录
            </div>
            <div class="flex items-center gap-1">
              <button
                :disabled="page <= 1"
                class="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                @click="onPageChange(page - 1)"
              >
                <Icon name="lucide:chevron-left" class="w-4 h-4" />
              </button>
              <span class="px-3 py-1.5 text-sm font-bold text-gray-700 dark:text-gray-300 min-w-[2rem] text-center">{{ page }}</span>
              <button
                :disabled="page * pageSize >= data.total"
                class="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                @click="onPageChange(page + 1)"
              >
                <Icon name="lucide:chevron-right" class="w-4 h-4" />
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
