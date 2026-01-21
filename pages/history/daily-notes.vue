<script setup lang="ts">
import { Icon } from '@iconify/vue'
import MarkdownIt from 'markdown-it'

definePageMeta({
  middleware: 'auth'
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
            Authorization: `Bearer ${session.access_token}`
        } as any
    }
  }
})

const columns = [
  { key: 'note_date', label: '日期' },
  { key: 'title', label: '标题' },
  { key: 'actions', label: '操作' }
]

const selectedNote = ref<any>(null)
const isModalOpen = ref(false)

function openNote(note: any) {
  selectedNote.value = note
  isModalOpen.value = true
}

function onPageChange(newPage: number) {
  page.value = newPage
  router.push({ query: { ...route.query, page: newPage } })
}

watch(() => route.query.page, (newPage) => {
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
            <Icon icon="heroicons:arrow-left" class="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </NuxtLink>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">每日笔记历史</h1>
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
                <th class="px-6 py-4">日期</th>
                <th class="px-6 py-4">标题</th>
                <th class="px-6 py-4 text-right">操作</th>
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
                  <button @click="openNote(note)" class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium">
                    查看详情
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          
          <!-- Pagination -->
          <div class="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
             <div class="text-sm text-gray-500">
                共 {{ data.total }} 条
             </div>
             <div class="flex gap-2">
                 <button 
                    :disabled="page <= 1"
                    @click="onPageChange(page - 1)"
                    class="px-3 py-1 text-sm rounded-md bg-gray-100 dark:bg-gray-700 disabled:opacity-50"
                 >
                    上一页
                 </button>
                 <span class="px-3 py-1 text-sm">{{ page }}</span>
                 <button 
                    :disabled="page * pageSize >= data.total"
                    @click="onPageChange(page + 1)"
                    class="px-3 py-1 text-sm rounded-md bg-gray-100 dark:bg-gray-700 disabled:opacity-50"
                 >
                    下一页
                 </button>
             </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <UiModal v-model="isModalOpen" :title="selectedNote?.title || '详情'" max-width="max-w-4xl">
      <div class="max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
        <div 
          v-if="selectedNote"
          v-html="md.render(selectedNote.content || '')" 
          class="prose dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300"
        ></div>
      </div>
      <div class="mt-6 flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
         <button 
           @click="isModalOpen = false" 
           class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
         >
           关闭
         </button>
      </div>
    </UiModal>
  </div>
</template>
