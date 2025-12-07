export const useUserConfig = () => {
  // Use useState to share state across components and SSR/CSR
  const config = useState('user-config', () => ({
    dida_token: '',
    dida_project_id: '',
    dida_project_name: '', // Store name for display without fetching
    dida_cookie: '',
    weekly_report_project_id: '',
    weekly_report_project_name: '',
    exclude_project_name: '',
    llm_api_key: '',
    llm_model: 'deepseek-ai/DeepSeek-V3.2-Exp',
    vision_model: 'Qwen/Qwen3-VL-32B-Instruct',
    llm_api_url: 'https://api.siliconflow.cn/v1/chat/completions',
    vision_api_key: '',
    vision_api_url: '',
    cal_enable: false,
    icloud_username: '',
    icloud_app_password: '',
    cal_lookahead_days: 2,
    calendar_target: '',
    timezone: 'Asia/Shanghai'
  }))

  const loading = useState('user-config-loading', () => false)
  const fetched = useState('user-config-fetched', () => false)
  const error = useState<string | null>('user-config-error', () => null)

  const client = useSupabaseClient()

  const load = async (force = false) => {
    // If already fetching or fetched, might skip? 
    // But user might want to refresh. Let's check if loading.
    if (loading.value && !force) return

    loading.value = true
    error.value = null
    try {
      const { data: { session } } = await client.auth.getSession()
      const headers: Record<string, string> = {}
      
      // On server side, pass the cookie
      if (import.meta.server) {
        const reqHeaders = useRequestHeaders(['cookie'])
        if (reqHeaders.cookie) {
            headers.cookie = reqHeaders.cookie
        }
      }
      
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
      }

      const data: any = await $fetch('/api/config', { 
        headers,
        timeout: 15000, // 15s timeout to prevent infinite loading
        retry: 1
      })
      if (data) {
        const flatData = { ...data, ...(data.settings || {}) }
        delete flatData.settings

        config.value = { ...config.value, ...flatData }
      }
      fetched.value = true
    } catch (e: any) {
      const errorMsg = e.message || ''
      // Check for refresh token error and force logout
      if (errorMsg.includes('Invalid Refresh Token') || errorMsg.includes('Refresh Token Not Found')) {
        await client.auth.signOut()
        navigateTo('/login')
        return
      }

      // Ignore 401 if just checking session state
      if (e.response?.status !== 401) {
        error.value = errorMsg || '加载配置失败'
      }
    } finally {
      loading.value = false
    }
  }

  const save = async () => {
    loading.value = true
    try {
      const { data: { session } } = await client.auth.getSession()
      await $fetch('/api/config', {
        method: 'POST',
        body: config.value,
        headers: {
          Authorization: session?.access_token ? `Bearer ${session.access_token}` : ''
        }
      })
      return true
    } catch (e: any) {
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    config,
    loading,
    fetched,
    error,
    load,
    save
  }
}
