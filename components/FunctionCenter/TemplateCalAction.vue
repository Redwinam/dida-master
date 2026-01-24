<script setup lang="ts">
import { Icon } from '@iconify/vue'
import FunctionCard from './FunctionCard.vue'
import Modal from '@/components/ui/Modal.vue'

const { $supabase } = useNuxtApp()
const client = $supabase as any
const toast = useToast()

const templates = ref<any[]>([])
const loadingTemplates = ref(false)
const templateId = ref('')
const inputText = ref('')
const creatingEvent = ref(false)

const showTemplateModal = ref(false)
const showTemplateDetailModal = ref(false)
const recentEvents = ref<any[]>([])
const loadingRecent = ref(false)
const creatingTemplate = ref(false)
const loadingTemplateDetail = ref(false)
const savingTemplate = ref(false)

const selectedEventId = ref('')
const templateName = ref('')
const fixedFields = ref<string[]>([])
const titleRule = ref('')
const editTemplateName = ref('')
const editFixedFields = ref<string[]>([])
const editTitleRule = ref('')

const baseEvent = reactive({
  title: '',
  start: '',
  end: '',
  location: '',
  calendar: '',
  allDay: false,
  description: '',
  reminders: ''
})
const editBaseEvent = reactive({
  title: '',
  start: '',
  end: '',
  location: '',
  calendar: '',
  allDay: false,
  description: '',
  reminders: ''
})

const fieldOptions = [
  { value: 'title', label: '标题' },
  { value: 'start', label: '开始时间' },
  { value: 'end', label: '结束时间' },
  { value: 'location', label: '地点' },
  { value: 'calendar', label: '日历' },
  { value: 'allDay', label: '全天' },
  { value: 'description', label: '备注' },
  { value: 'reminders', label: '提醒' }
]

const apiGuide = {
  endpoint: '/api/actions/template-calendar',
  method: 'POST',
  description: '根据模板与文本创建日历事件。',
  params: {
    template_id: 'Required. 模板 ID',
    text: 'Required. 本次日程描述'
  },
  example: `curl -X POST https://your-domain.com/api/actions/template-calendar \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"template_id": "TEMPLATE_ID", "text": "普拉提：核心床 今天19:40-20:40"}'`
}

const resetTemplateForm = () => {
  selectedEventId.value = ''
  templateName.value = ''
  fixedFields.value = []
  titleRule.value = ''
  baseEvent.title = ''
  baseEvent.start = ''
  baseEvent.end = ''
  baseEvent.location = ''
  baseEvent.calendar = ''
  baseEvent.allDay = false
  baseEvent.description = ''
  baseEvent.reminders = ''
}
const resetTemplateDetailForm = () => {
  editTemplateName.value = ''
  editFixedFields.value = []
  editTitleRule.value = ''
  editBaseEvent.title = ''
  editBaseEvent.start = ''
  editBaseEvent.end = ''
  editBaseEvent.location = ''
  editBaseEvent.calendar = ''
  editBaseEvent.allDay = false
  editBaseEvent.description = ''
  editBaseEvent.reminders = ''
}

const applyEventToBase = (ev: any) => {
  baseEvent.title = ev?.title || ''
  baseEvent.start = ev?.start ? new Date(ev.start).toISOString() : ''
  baseEvent.end = ev?.end ? new Date(ev.end).toISOString() : ''
  baseEvent.location = ev?.location || ''
  baseEvent.calendar = ev?.calendar || ''
  baseEvent.allDay = false
  baseEvent.description = ''
  baseEvent.reminders = ''
}

const getReminders = () => {
  return baseEvent.reminders
    .split(',')
    .map((v) => parseInt(v.trim(), 10))
    .filter((v) => Number.isFinite(v) && v > 0)
}
const getEditReminders = () => {
  return editBaseEvent.reminders
    .split(',')
    .map((v) => parseInt(v.trim(), 10))
    .filter((v) => Number.isFinite(v) && v > 0)
}

const fetchTemplates = async () => {
  loadingTemplates.value = true
  try {
    const { data: { session } } = await client.auth.getSession()
    const res: any = await $fetch('/api/templates/calendar', {
      headers: {
        Authorization: session?.access_token ? `Bearer ${session.access_token}` : ''
      }
    })
    templates.value = res?.data || []
    if (templates.value.length > 0 && !templateId.value) {
      templateId.value = templates.value[0].id
    }
  } catch (e: any) {
    toast.add({ title: '模板加载失败', description: e.message, color: 'error' })
  } finally {
    loadingTemplates.value = false
  }
}

const fetchRecentEvents = async () => {
  loadingRecent.value = true
  try {
    const { data: { session } } = await client.auth.getSession()
    const res: any = await $fetch('/api/templates/calendar/recent', {
      headers: {
        Authorization: session?.access_token ? `Bearer ${session.access_token}` : ''
      }
    })
    recentEvents.value = res?.events || []
  } catch (e: any) {
    toast.add({ title: '获取最近日程失败', description: e.message, color: 'error' })
  } finally {
    loadingRecent.value = false
  }
}

const openTemplateModal = async () => {
  showTemplateModal.value = true
  resetTemplateForm()
  await fetchRecentEvents()
}
const openTemplateDetail = async () => {
  if (!templateId.value) return
  showTemplateDetailModal.value = true
  resetTemplateDetailForm()
  loadingTemplateDetail.value = true
  try {
    const { data: { session } } = await client.auth.getSession()
    const res: any = await $fetch(`/api/templates/calendar/${templateId.value}`, {
      headers: {
        Authorization: session?.access_token ? `Bearer ${session.access_token}` : ''
      }
    })
    editTemplateName.value = res?.name || ''
    editFixedFields.value = Array.isArray(res?.rules?.fixed_fields) ? res.rules.fixed_fields : []
    editTitleRule.value = res?.rules?.title_rule || ''
    editBaseEvent.title = res?.base_event?.title || ''
    editBaseEvent.start = res?.base_event?.start || ''
    editBaseEvent.end = res?.base_event?.end || ''
    editBaseEvent.location = res?.base_event?.location || ''
    editBaseEvent.calendar = res?.base_event?.calendar || ''
    editBaseEvent.allDay = !!res?.base_event?.allDay
    editBaseEvent.description = res?.base_event?.description || ''
    editBaseEvent.reminders = Array.isArray(res?.base_event?.reminders) ? res.base_event.reminders.join(', ') : ''
  } catch (e: any) {
    toast.add({ title: '模板详情加载失败', description: e.message, color: 'error' })
  } finally {
    loadingTemplateDetail.value = false
  }
}

const createTemplate = async () => {
  if (!templateName.value) {
    toast.add({ title: '请输入模板名称', color: 'warning' })
    return
  }
  if (!baseEvent.title && !baseEvent.location && !baseEvent.calendar) {
    toast.add({ title: '模板基础信息不足', description: '请选择日程或补充基础字段', color: 'warning' })
    return
  }
  creatingTemplate.value = true
  try {
    const { data: { session } } = await client.auth.getSession()
    const payload = {
      name: templateName.value,
      base_event: {
        title: baseEvent.title,
        start: baseEvent.start,
        end: baseEvent.end,
        location: baseEvent.location,
        calendar: baseEvent.calendar,
        allDay: baseEvent.allDay,
        description: baseEvent.description,
        reminders: getReminders()
      },
      rules: {
        fixed_fields: fixedFields.value,
        title_rule: titleRule.value
      }
    }
    await $fetch('/api/templates/calendar', {
      method: 'POST',
      headers: {
        Authorization: session?.access_token ? `Bearer ${session.access_token}` : ''
      },
      body: payload
    })
    toast.add({ title: '模板创建成功', color: 'success' })
    showTemplateModal.value = false
    await fetchTemplates()
  } catch (e: any) {
    toast.add({ title: '模板创建失败', description: e.message, color: 'error' })
  } finally {
    creatingTemplate.value = false
  }
}

const updateTemplate = async () => {
  if (!templateId.value) return
  if (!editTemplateName.value) {
    toast.add({ title: '请输入模板名称', color: 'warning' })
    return
  }
  savingTemplate.value = true
  try {
    const { data: { session } } = await client.auth.getSession()
    const payload = {
      name: editTemplateName.value,
      base_event: {
        title: editBaseEvent.title,
        start: editBaseEvent.start,
        end: editBaseEvent.end,
        location: editBaseEvent.location,
        calendar: editBaseEvent.calendar,
        allDay: editBaseEvent.allDay,
        description: editBaseEvent.description,
        reminders: getEditReminders()
      },
      rules: {
        fixed_fields: editFixedFields.value,
        title_rule: editTitleRule.value
      }
    }
    await $fetch(`/api/templates/calendar/${templateId.value}`, {
      method: 'PATCH' as any,
      headers: {
        Authorization: session?.access_token ? `Bearer ${session.access_token}` : ''
      },
      body: payload
    })
    toast.add({ title: '模板已更新', color: 'success' })
    showTemplateDetailModal.value = false
    await fetchTemplates()
  } catch (e: any) {
    toast.add({ title: '模板更新失败', description: e.message, color: 'error' })
  } finally {
    savingTemplate.value = false
  }
}

const triggerTemplateCalendar = async () => {
  if (!templateId.value || !inputText.value) return
  creatingEvent.value = true
  try {
    const { data: { session } } = await client.auth.getSession()
    const res: any = await $fetch('/api/actions/template-calendar', {
      method: 'POST',
      headers: {
        Authorization: session?.access_token ? `Bearer ${session.access_token}` : ''
      },
      body: { template_id: templateId.value, text: inputText.value }
    })
    toast.add({ title: '日历事件已添加', description: res?.event?.title || '创建成功', color: 'success' })
    inputText.value = ''
  } catch (e: any) {
    toast.add({ title: '处理失败', description: e.message, color: 'error' })
  } finally {
    creatingEvent.value = false
  }
}

onMounted(() => {
  fetchTemplates()
})
</script>

<template>
  <FunctionCard
    title="模板日程添加"
    description="基于固定模板快速生成日历事件，例如普拉提、课程、固定地点等高重复日程。"
    icon="heroicons:bookmark-square"
    colorClass="text-amber-600 dark:text-amber-400"
    bgClass="bg-amber-100 dark:bg-amber-900/50"
    :apiGuide="apiGuide"
  >
    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <select
          v-model="templateId"
          class="flex-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white"
        >
          <option value="" disabled>请选择模板</option>
          <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">
            {{ tpl.name }}
          </option>
        </select>
        <button
          @click="fetchTemplates"
          :disabled="loadingTemplates"
          class="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200"
        >
          <Icon v-if="loadingTemplates" icon="line-md:loading-twotone-loop" class="w-4 h-4" />
          <Icon v-else icon="heroicons:arrow-path" class="w-4 h-4" />
        </button>
        <button
          @click="openTemplateDetail"
          :disabled="!templateId"
          class="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200 disabled:opacity-50"
        >
          <Icon icon="heroicons:pencil-square" class="w-4 h-4" />
        </button>
      </div>

      <textarea
        v-model="inputText"
        rows="3"
        placeholder="例如：普拉提：核心床 今天19:40-20:40"
        class="block w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 sm:text-sm resize-none"
      ></textarea>

      <button
        @click="triggerTemplateCalendar"
        :disabled="creatingEvent || !templateId || !inputText"
        class="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Icon v-if="creatingEvent" icon="line-md:loading-twotone-loop" class="w-5 h-5" />
        <Icon v-else icon="heroicons:sparkles" class="w-5 h-5" />
        基于模板创建
      </button>

      <button
        @click="openTemplateModal"
        class="w-full py-2.5 px-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200"
      >
        新建模板
      </button>
    </div>
  </FunctionCard>

  <Modal v-model="showTemplateModal" title="创建日程模板" maxWidth="max-w-3xl">
    <div class="space-y-5">
      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">模板名称</label>
        <input
          v-model="templateName"
          type="text"
          class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white"
        />
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">最近日程</label>
        <div class="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
          <div v-if="loadingRecent" class="p-3 text-sm text-gray-500">加载中...</div>
          <button
            v-for="ev in recentEvents"
            :key="ev.start + ev.title"
            @click="selectedEventId = ev.start + ev.title; applyEventToBase(ev)"
            class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50"
            :class="selectedEventId === ev.start + ev.title ? 'bg-amber-50 dark:bg-amber-900/20' : ''"
          >
            <div class="font-medium text-gray-900 dark:text-white">{{ ev.title || '未命名' }}</div>
            <div class="text-xs text-gray-500">{{ ev.start ? new Date(ev.start).toLocaleString('zh-CN', { hour12: false }) : '' }} {{ ev.location || '' }}</div>
          </button>
          <div v-if="!loadingRecent && recentEvents.length === 0" class="p-3 text-sm text-gray-500">
            暂无最近日程
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">标题</label>
          <input v-model="baseEvent.title" type="text" class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white" />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">地点</label>
          <input v-model="baseEvent.location" type="text" class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white" />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">开始时间</label>
          <input v-model="baseEvent.start" type="text" placeholder="ISO 时间" class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white" />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">结束时间</label>
          <input v-model="baseEvent.end" type="text" placeholder="ISO 时间" class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white" />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">日历</label>
          <input v-model="baseEvent.calendar" type="text" class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white" />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">提醒 (分钟, 逗号分隔)</label>
          <input v-model="baseEvent.reminders" type="text" class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white" />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">全天</label>
          <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input v-model="baseEvent.allDay" type="checkbox" class="rounded border-gray-300 dark:border-gray-600 text-amber-600" />
            全天日程
          </label>
        </div>
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">备注</label>
        <textarea v-model="baseEvent.description" rows="2" class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white"></textarea>
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">固定字段</label>
        <div class="flex flex-wrap gap-2">
          <label v-for="field in fieldOptions" :key="field.value" class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input type="checkbox" :value="field.value" v-model="fixedFields" class="rounded border-gray-300 dark:border-gray-600 text-amber-600" />
            {{ field.label }}
          </label>
        </div>
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">标题规则</label>
        <textarea v-model="titleRule" rows="3" placeholder="例如：标题以“普拉提：”开头，包含课程类型，语气简洁" class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white"></textarea>
      </div>

      <div class="flex justify-end gap-3">
        <button
          @click="showTemplateModal = false"
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200"
        >
          取消
        </button>
        <button
          @click="createTemplate"
          :disabled="creatingTemplate"
          class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium"
        >
          <Icon v-if="creatingTemplate" icon="line-md:loading-twotone-loop" class="w-4 h-4" />
          <span v-else>创建模板</span>
        </button>
      </div>
    </div>
  </Modal>

  <Modal v-model="showTemplateDetailModal" title="模板详情与编辑" maxWidth="max-w-3xl">
    <div class="space-y-5">
      <div v-if="loadingTemplateDetail" class="py-6 text-center text-sm text-gray-500">加载中...</div>
      <div v-else class="space-y-5">
        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">模板名称</label>
          <input
            v-model="editTemplateName"
            type="text"
            class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white"
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-if="editFixedFields.includes('title')" class="space-y-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">标题</label>
            <input v-model="editBaseEvent.title" type="text" class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white" />
          </div>
          <div v-if="editFixedFields.includes('location')" class="space-y-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">地点</label>
            <input v-model="editBaseEvent.location" type="text" class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white" />
          </div>
          <div v-if="editFixedFields.includes('start')" class="space-y-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">开始时间</label>
            <input v-model="editBaseEvent.start" type="text" placeholder="ISO 时间" class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white" />
          </div>
          <div v-if="editFixedFields.includes('end')" class="space-y-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">结束时间</label>
            <input v-model="editBaseEvent.end" type="text" placeholder="ISO 时间" class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white" />
          </div>
          <div v-if="editFixedFields.includes('calendar')" class="space-y-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">日历</label>
            <input v-model="editBaseEvent.calendar" type="text" class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white" />
          </div>
          <div v-if="editFixedFields.includes('reminders')" class="space-y-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">提醒 (分钟, 逗号分隔)</label>
            <input v-model="editBaseEvent.reminders" type="text" class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white" />
          </div>
          <div v-if="editFixedFields.includes('allDay')" class="space-y-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">全天</label>
            <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input v-model="editBaseEvent.allDay" type="checkbox" class="rounded border-gray-300 dark:border-gray-600 text-amber-600" />
              全天日程
            </label>
          </div>
        </div>

        <div v-if="editFixedFields.includes('description')" class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">备注</label>
          <textarea v-model="editBaseEvent.description" rows="2" class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white"></textarea>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">固定字段</label>
          <div class="flex flex-wrap gap-2">
            <label v-for="field in fieldOptions" :key="field.value" class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input type="checkbox" :value="field.value" v-model="editFixedFields" class="rounded border-gray-300 dark:border-gray-600 text-amber-600" />
              {{ field.label }}
            </label>
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">标题规则</label>
          <textarea v-model="editTitleRule" rows="3" placeholder="例如：标题以“普拉提：”开头，包含课程类型，语气简洁" class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white"></textarea>
        </div>

        <div class="flex justify-end gap-3">
          <button
            @click="showTemplateDetailModal = false"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200"
          >
            取消
          </button>
          <button
            @click="updateTemplate"
            :disabled="savingTemplate"
            class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium"
          >
            <Icon v-if="savingTemplate" icon="line-md:loading-twotone-loop" class="w-4 h-4" />
            <span v-else>保存</span>
          </button>
        </div>
      </div>
    </div>
  </Modal>
</template>
