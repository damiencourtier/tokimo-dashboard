export interface AuthUser {
  id: number
  email: string
  role: 'user' | 'admin'
}

/**
 * État d'authentification, entièrement côté client (SPA — voir nuxt.config.ts).
 * Remplace l'ancien useUserSession() de nuxt-auth-utils : la session vit
 * maintenant dans un cookie JWT httpOnly posé par l'API externe.
 */
export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const loggedIn = computed(() => user.value !== null)
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function fetchUser() {
    const api = useApi()
    try {
      user.value = await api<AuthUser>('/me')
    } catch {
      user.value = null
    }
  }

  async function login(email: string, password: string) {
    const api = useApi()
    await api('/login', { method: 'POST', body: { email, password } })
    await fetchUser()
  }

  async function logout() {
    const api = useApi()
    try {
      await api('/logout', { method: 'POST' })
    } finally {
      user.value = null
    }
  }

  return { user, loggedIn, isAdmin, fetchUser, login, logout }
}
