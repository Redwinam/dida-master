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
  <div class="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-900">
    <div class="max-w-5xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-4">
          <NuxtLink to="/" class="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <Icon name="heroicons:arrow-left" class="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </NuxtLink>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            每日笔记历史
          </h1>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div v-if="pending" class="p-8 text-center text-gray-500">
          加载中...
        </div>
        <div v-else-if="!data?.data || data.data.length === 0" class="p-8 text-center text-gray-500">
          暂无数据
        </div>
        <div v-else>
          <table class="w-full text-left">
            <thead class="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-sm font-medium">
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
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
              <tr v-for="note in data.data" :key="note.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td class="px-6 py-4 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                  {{ new Date(note.note_date).toLocaleDateString() }}
                </td>
                <td class="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">
                  {{ note.title }}
                </td>
                <td class="px-6 py-4 text-right">
                  <button class="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 text-sm font-medium" @click="openNote(note)">
                    查看详情
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Pagination -->
          <div class="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <div class="text-sm text-gray-500 dark:text-gray-400">
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
