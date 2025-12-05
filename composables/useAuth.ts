export const useAuth = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const router = useRouter()

  const loading = ref(false)
  const error = ref<string | null>(null)

  const login = async (email: string, password?: string) => {
    loading.value = true
    error.value = null
    try {
      let result
      if (password) {
        result = await supabase.auth.signInWithPassword({
          email,
          password
        })
      } else {
        result = await supabase.auth.signInWithOtp({
          email
        })
      }
      
      if (result.error) throw result.error
      
      return result.data
    } catch (e: any) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  const register = async (email: string, password?: string) => {
    loading.value = true
    error.value = null
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: password || undefined,
      })

      if (signUpError) throw signUpError
      return data
    } catch (e: any) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    loading.value = true
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    loading,
    error,
    login,
    register,
    logout
  }
}
