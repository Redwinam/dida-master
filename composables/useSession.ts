export const useSession = () => {
  const { $supabase } = useNuxtApp()
  const supabase = $supabase as any
  const user = useState<any | null>('auth-user', () => null)
  const initialized = useState('auth-user-initialized', () => false)
  const listenerReady = useState('auth-user-listener', () => false)
  const router = useRouter()
  const loading = ref(false)
  const error = ref<string | null>(null)

  const refreshUser = async () => {
    try {
      const { data, error: err } = await supabase.auth.getUser()
      if (err) throw err
      user.value = data?.user || null
    }
    catch (e: any) {
      error.value = e.message
      user.value = null
    }
  }

  if (supabase && !initialized.value) {
    initialized.value = true
    refreshUser()
  }

  if (import.meta.client && supabase && !listenerReady.value) {
    listenerReady.value = true
    supabase.auth.onAuthStateChange((_event: any, session: any) => {
      user.value = session?.user || null
    })
  }

  const logout = async () => {
    loading.value = true
    error.value = null
    try {
      const { error: err } = await supabase.auth.signOut()
      if (err) throw err
      user.value = null
      router.push('/login')
    }
    catch (e: any) {
      error.value = e.message
    }
    finally {
      loading.value = false
    }
  }

  return {
    user,
    logout,
    loading,
    error,
    refreshUser,
  }
}
