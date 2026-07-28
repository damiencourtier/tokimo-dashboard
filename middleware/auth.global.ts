export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  const { loggedIn, fetchUser } = useAuth()
  if (!loggedIn.value) {
    await fetchUser()
  }
  if (!loggedIn.value) {
    return navigateTo('/login')
  }
})
