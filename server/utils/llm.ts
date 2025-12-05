import OpenAI from 'openai'

export const createLLMClient = (apiKey: string, baseURL: string) => {
  // Normalize baseURL: remove /chat/completions suffix and trailing slash
  let finalBaseURL = baseURL
  if (finalBaseURL.endsWith('/chat/completions')) {
      finalBaseURL = finalBaseURL.replace('/chat/completions', '')
  }
  if (finalBaseURL.endsWith('/')) {
      finalBaseURL = finalBaseURL.slice(0, -1)
  }

  return new OpenAI({
    apiKey,
    baseURL: finalBaseURL
  })
}

export const generateDailyPlan = async (client: OpenAI, model: string, tasksContext: string, calendarContext: string) => {
  const prompt = `你是一个高效的时间管理专家，专门为INTJ人格类型设计日程安排。
请根据以下任务列表，为我制定今天的日程安排。并提供一些针对各项任务与一天具体的专业建议。
（但回复中无需提到INTJ属性；返回格式中不使用表格）

今日行程：
${calendarContext}

任务列表：
${tasksContext}
`

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: 'You are an expert time management assistant.' },
      { role: 'user', content: prompt }
    ]
  })

  return completion.choices[0]?.message?.content || ''
}

export const parseTextToCalendar = async (client: OpenAI, model: string, text: string, calendars: string[], todayDate: string) => {
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

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: text }
    ],
    max_tokens: 1000
  })

  const content = completion.choices[0]?.message?.content || '[]'
  // Try to strip markdown code blocks if present
  const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim()
  try {
    return JSON.parse(jsonStr)
  } catch (e) {
    console.error('Failed to parse JSON from LLM', content)
    return []
  }
}

export const parseImageToCalendar = async (client: OpenAI, model: string, imageBase64: string, calendars: string[], todayDate: string) => {
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

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
              detail: 'auto'
            }
          }
        ]
      }
    ],
    max_tokens: 1000 // Ensure we have enough tokens for JSON response
  })

  const content = completion.choices[0]?.message?.content || '[]'
  // Try to strip markdown code blocks if present
  const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim()
  try {
    return JSON.parse(jsonStr)
  } catch (e) {
    console.error('Failed to parse JSON from LLM', content)
    return []
  }
}
