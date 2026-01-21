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
  } else if (config.supabaseServiceKey) {
    console.log('[LLM] Using Service Key')
  } else if (config.public.supabaseKey) {
    console.log('[LLM] Using Public Key')
  }
  
  if (!token) {
    throw createError({ statusCode: 500, message: 'Supabase key missing' })
  }
  return `Bearer ${token}`
}

const extractContent = (response: any) => {
  return (
    response?.content ||
    response?.data?.content ||
    response?.result?.content ||
    response?.choices?.[0]?.message?.content ||
    ''
  )
}

const callAiGateway = async (serviceKey: string, input: Record<string, any>, userToken?: string) => {
  const url = getAiGatewayUrl()
  
  // Ensure userToken is a valid string if provided
  const validUserToken = userToken && userToken.length > 20 ? userToken : undefined
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: validUserToken ? `Bearer ${validUserToken}` : getAiGatewayAuthHeader()
  }
  
  // Debug log (masked)
  if (process.env.NODE_ENV === 'development') {
    const authType = validUserToken ? 'User Token' : 'System Key'
    console.log(`[AiGateway] Calling ${serviceKey} with ${authType}`)
  }
  
  try {
    const response = await $fetch(url, {
      method: 'POST',
      headers,
      body: {
        service_key: serviceKey,
        input
      },
      // Increase timeout for LLM calls
      timeout: 60000 
    }) as any
    return extractContent(response)
  } catch (e: any) {
    console.error(`[AiGateway] Error calling ${serviceKey}:`, e.response?.status, e.response?.statusText)
    if (e.response?.status === 401) {
       console.error('[AiGateway] 401 Unauthorized. Token used:', headers.Authorization?.substring(0, 20) + '...')
    }
    throw e
  }
}

export const generateDailyPlan = async (tasksContext: string, calendarContext: string, timezone: string = 'Asia/Shanghai', userToken?: string) => {
  const todayStr = new Date().toLocaleDateString('zh-CN', { 
    timeZone: timezone,
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    weekday: 'long' 
  })

  const prompt = `你是一个高效的时间管理专家，专门为INTJ人格类型设计日程安排。
今天是${todayStr}。
请根据以下任务列表，为我制定今天的日程安排。并提供一些针对各项任务与一天具体的专业建议。
（但回复中无需提到INTJ属性；返回格式中不使用表格、无需一级标题）

近日行程：
${calendarContext}

任务列表：
${tasksContext}
`
  return await callAiGateway('DIDA_DAILY_NOTE', { type: 'text', prompt }, userToken)
}

export const generateWeeklyReport = async (
  completedTasksContext: string, 
  uncompletedTasksContext: string,
  calendarContext: string, 
  nextWeekCalendarContext: string,
  timezone: string = 'Asia/Shanghai',
  userToken?: string
) => {
  const now = new Date()
  const endStr = now.toLocaleDateString('zh-CN', { timeZone: timezone })
  const start = new Date(now)
  start.setDate(start.getDate() - 7)
  const startStr = start.toLocaleDateString('zh-CN', { timeZone: timezone })

  const prompt = `你是一个高效的时间管理专家。
请根据过去一周（${startStr} 至 ${endStr}）的完成任务、日程，以及当前未完成的任务和下周的日程安排，为我生成一份周报。

过去一周行程：
${calendarContext}

已完成任务列表：
${completedTasksContext}

当前未完成任务列表（待办）：
${uncompletedTasksContext}

下周行程预览：
${nextWeekCalendarContext}

请总结我的工作成就、时间分配情况，并给出下周的建议。（本人为INTJ人格类型，但回复中无需提到INTJ属性；返回格式中不使用表格、无需一级标题）
`
  return await callAiGateway('DIDA_WEEKLY_REPORT', { type: 'text', prompt }, userToken)
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
  } catch (e) {
    console.error('Failed to parse JSON from LLM', content)
    return []
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
  } catch (e) {
    console.error('Failed to parse JSON from LLM', content)
    return []
  }
}
