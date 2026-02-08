export default defineNuxtRouteMiddleware(async to => {
  if (import.meta.server) {
    return
  }
  const { user, refreshUser } = useSession()

  if (!user.value) {
    await refreshUser()
  }

  if (!user.value && to.path !== '/login') {
    return navigateTo('/login')
  }
})
