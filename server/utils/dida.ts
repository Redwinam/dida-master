export const getDidaProjects = async (token: string) => {
  return await $fetch('https://api.dida365.com/open/v1/project', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
}

export const getDidaTasks = async (token: string, projectId: string) => {
  const data: any = await $fetch(`https://api.dida365.com/open/v1/project/${projectId}/data`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  return data?.tasks || []
}

export const createDidaNote = async (token: string, projectId: string, title: string, content: string) => {
  const now = new Date()
  const startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString().replace(/\.\d{3}Z$/, '+0800') // Simplification for Asia/Shanghai
  const dueDate = new Date(now.setHours(23, 59, 59, 999)).toISOString().replace(/\.\d{3}Z$/, '+0800')

  return await $fetch('https://api.dida365.com/open/v1/task', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: {
      title,
      content,
      projectId,
      isAllDay: true,
      startDate, // Note: Dida API format might need checking, but python used ISO with timezone
      dueDate,
      timeZone: "Asia/Shanghai",
      kind: "NOTE"
    }
  })
}
