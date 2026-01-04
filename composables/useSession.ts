export const useSession = () => {
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()
  const router = useRouter()
  const loading = ref(false)
  const error = ref<string | null>(null)

  const logout = async () => {
    loading.value = true
    error.value = null
    try {
      const { error: err } = await supabase.auth.signOut()
      if (err) throw err
      router.push('/login')
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    logout,
    loading,
    error
  }
}
