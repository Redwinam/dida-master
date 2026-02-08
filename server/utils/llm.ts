const getAiGatewayUrl = () => {
  const config = useRuntimeConfig()
  const baseUrl = (config.public.supabaseUrl as string | undefined)?.replace(/\/$/, '')
  if (!baseUrl) {
    throw createError({ statusCode: 500, message: 'Supabase URL missing' })
  }
  return `${baseUrl}/functions/v1/ai-gateway`
}

const getAiGatewayAuthHeader = () => {
  const config = useRuntimeConfig()
  const token = (config.supabaseServiceRoleKey || config.supabaseServiceKey || config.public.supabaseKey || config.public.supabaseAnonKey) as string | undefined

  if (config.supabaseServiceRoleKey) {
    console.log('[LLM] Using Service Role Key (Starts with):', config.supabaseServiceRoleKey.substring(0, 10) + '...')
  }
  else if (config.supabaseServiceKey) {
    console.log('[LLM] Using Service Key')
  }
  else if (config.public.supabaseKey) {
    console.log('[LLM] Using Public Key')
  }

  if (!token) {
    throw createError({ statusCode: 500, message: 'Supabase key missing' })
  }
  return `Bearer ${token}`
}

const extractContent = (response: any) => {
  return (
    response?.content
    || response?.data?.content
    || response?.result?.content
    || response?.choices?.[0]?.message?.content
    || ''
  )
}

const callAiGateway = async (serviceKey: string, input: Record<string, any>, userToken?: string, userId?: string, callbackUrl?: string, callbackPayload?: Record<string, any>) => {
  const url = getAiGatewayUrl()

  // Ensure userToken is a valid string if provided
  const validUserToken = userToken && userToken.length > 20 ? userToken : undefined

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': validUserToken ? `Bearer ${validUserToken}` : getAiGatewayAuthHeader(),
  }

  // Debug log (masked)
  if (process.env.NODE_ENV === 'development') {
    const authType = validUserToken ? 'User Token' : 'System Key'
    console.log(`[AiGateway] Calling ${serviceKey} with ${authType}`)
  }

  const body: any = {
    service_key: serviceKey,
    input,
  }
  if (userId) {
    body.user_id = userId
  }
  if (callbackUrl) {
    body.callback_url = callbackUrl
    body.callback_payload = callbackPayload
  }

  try {
    const response = await $fetch(url, {
      method: 'POST',
      headers,
      body,
      // Increase timeout for LLM calls
      timeout: 60000,
    }) as any

    if (callbackUrl) {
      // In async mode, return the full response (e.g. { status: 'queued' })
      return response
    }

    return extractContent(response)
  }
  catch (e: any) {
    console.error(`[AiGateway] Error calling ${serviceKey}:`, e.response?.status, e.response?.statusText)
    if (e.response?.status === 401) {
      console.error('[AiGateway] 401 Unauthorized. Token used:', headers.Authorization?.substring(0, 20) + '...')
    }
    throw e
  }
}

export const generateDailyPlan = async (tasksContext: string, calendarContext: string, timezone: string = 'Asia/Shanghai', userToken?: string, mbti?: string, userId?: string, callbackUrl?: string, callbackPayload?: Record<string, any>) => {
  const todayStr = new Date().toLocaleDateString('zh-CN', {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  const persona = mbti ? `，专门为${mbti}人格类型设计日程安排` : ''
  const constraint = mbti ? `（但回复中无需提到${mbti}属性；返回格式中不使用表格、无需一级标题）` : '（返回格式中不使用表格、无需一级标题）'

  const prompt = `你是一个高效的时间管理专家${persona}。
今天是${todayStr}。
请根据以下任务列表，为我制定今天的日程安排。并提供一些针对各项任务与一天具体的专业建议。
${constraint}

近日行程：
${calendarContext}

待办任务：
${tasksContext}

请直接输出内容，不要使用markdown代码块包裹。`

  return await callAiGateway('DIDA_DAILY_NOTE', { type: 'text', prompt }, userToken, userId, callbackUrl, callbackPayload)
}

export const generateWeeklyReport = async (
  completedTasksContext: string,
  uncompletedTasksContext: string,
  calendarContext: string,
  nextWeekCalendarContext: string,
  timezone: string = 'Asia/Shanghai',
  userToken?: string,
  mbti?: string,
  userId?: string,
  callbackUrl?: string,
  callbackPayload?: Record<string, any>,
) => {
  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - 7)
  const dateStr = `${start.toLocaleDateString('zh-CN', { timeZone: timezone })} - ${today.toLocaleDateString('zh-CN', { timeZone: timezone })}`

  const persona = mbti ? `，专门为${mbti}人格类型撰写周报` : ''
  const constraint = mbti ? `（但回复中无需提到${mbti}属性；返回格式中不使用表格、无需一级标题）` : '（返回格式中不使用表格、无需一级标题）'

  const prompt = `你是一个专业的项目经理${persona}。
今天是${today.toLocaleDateString('zh-CN', { timeZone: timezone })}。
请根据以下信息，为我撰写一份本周工作周报。
周报周期：${dateStr}
${constraint}

本周完成任务：
${completedTasksContext}

本周未完成任务：
${uncompletedTasksContext}

本周行程记录：
${calendarContext}

下周行程预览：
${nextWeekCalendarContext}

请按以下结构输出：
1. 本周工作总结
2. 完成情况分析
3. 下周工作计划
4. 改进建议

请直接输出内容，不要使用markdown代码块包裹。`

  return await callAiGateway('DIDA_WEEKLY_REPORT', { type: 'text', prompt }, userToken, userId, callbackUrl, callbackPayload)
}

export const parseTextToCalendar = async (text: string, calendars: string[], todayDate: string, userToken?: string) => {
  const prompt = `请识别文本中的日程信息，并将其转换为 JSON 格式。
当前日期是: ${todayDate}
允许的日历名称: ${calendars.join(', ')} (如果无法确定，默认为"${calendars[0] || '默认'}")

返回格式必须是 JSON 数组，包含以下字段:
- title: 事件标题
- start: 开始时间 (ISO 8601 格式)
- end: 结束时间 (ISO 8601 格式)
- location: 地点 (可选)
- calendar: 日历名称 (必须从允许列表中选择)
- allDay: 是否全天 (boolean)

只返回 JSON，不要包含 markdown 标记。`
  const content = await callAiGateway('DIDA_TEXT_TO_CALENDAR', { type: 'text', prompt, text }, userToken)
  // Try to strip markdown code blocks if present
  const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim()
  try {
    return JSON.parse(jsonStr)
  }
  catch (e) {
    console.error('Failed to parse JSON from LLM', content)
    return []
  }
}

export const parseTextToTemplateFields = async (
  text: string,
  calendars: string[],
  todayDate: string,
  timezone: string,
  template: any,
  userToken?: string,
) => {
  const rules = template?.rules || {}
  const fixedFields = Array.isArray(rules.fixed_fields) ? rules.fixed_fields : []
  const allowedFields = ['title', 'start', 'end', 'location', 'calendar', 'allDay', 'description', 'reminders'].filter(
    field => !fixedFields.includes(field),
  )
  const titleRule = rules?.title_rule || ''
  const titleRuleLine = titleRule ? `标题规则: ${titleRule}` : ''
  const prompt = `你是一个日程助理，请根据用户日程生成 JSON（无 markdown/解释）日程，且只输出字段：${allowedFields.join(', ')}。
用户日程：${text}
今天是：${todayDate}, 时区：${timezone}。
${titleRuleLine}
时间日期格式：start/end 使用 ISO 8601（如 2026-01-24T19:40:00+08:00）。
允许的日历名称：${calendars.join(', ')} (不确定时用 "${calendars[0] || '默认'}")`

  if (process.env.NODE_ENV !== 'production') {
    console.log('[TemplateParse] Prompt', prompt)
  }

  const content = await callAiGateway('DIDA_TEXT_TO_CALENDAR', { type: 'text', prompt, text }, userToken)
  const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim()
  try {
    const parsed = JSON.parse(jsonStr)
    return parsed
  }
  catch (e) {
    console.error('Failed to parse JSON from LLM', content)
    return {}
  }
}

export const parseImageToCalendar = async (imageBase64: string, calendars: string[], todayDate: string, userToken?: string) => {
  const prompt = `请识别图片中的日程信息，并将其转换为 JSON 格式。
当前日期是: ${todayDate}
允许的日历名称: ${calendars.join(', ')} (如果无法确定，默认为"${calendars[0] || '默认'}")

返回格式必须是 JSON 数组，包含以下字段:
- title: 事件标题
- start: 开始时间 (ISO 8601 格式)
- end: 结束时间 (ISO 8601 格式)
- location: 地点 (可选)
- calendar: 日历名称 (必须从允许列表中选择)
- allDay: 是否全天 (boolean)

只返回 JSON，不要包含 markdown 标记。`
  const content = await callAiGateway('DIDA_IMAGE_TO_CALENDAR', { type: 'image', prompt, image_base64: imageBase64 }, userToken)
  // Try to strip markdown code blocks if present
  const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim()
  try {
    return JSON.parse(jsonStr)
  }
  catch (e) {
    console.error('Failed to parse JSON from LLM', content)
    return []
  }
}
