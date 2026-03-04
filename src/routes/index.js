import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { getMemberStatusDetail, signOutUser } from '../api/auth'
import routes from './routes'

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  await authStore.waitForInit()
  const isAuthenticated = authStore.isLoggedIn
  const requiresAuth = to.meta.requiresAuth !== false
  console.info('[KW_ROUTE_GUARD] beforeEach', {
    to: to.fullPath,
    requiresAuth,
    isAuthenticated,
    uid: authStore.user?.uid ?? '',
  })

  if (requiresAuth && !isAuthenticated) {
    console.info('[KW_ROUTE_GUARD] unauthenticated -> login')
    return { name: 'login' }
  }

  if (requiresAuth && isAuthenticated) {
    try {
      const detail = await getMemberStatusDetail(authStore.user?.uid)
      const status = detail?.status ?? null
      const role = detail?.role ?? 'USER'
      console.info('[KW_ROUTE_GUARD] member status', {
        uid: authStore.user?.uid ?? '',
        status,
        role,
      })
      if (status !== 'APPROVED') {
        await signOutUser()
        console.warn('[KW_ROUTE_GUARD] non-approved -> login', { status })
        return { name: 'login', query: { pending: '1', status: String(status ?? '') } }
      }

      const allowedRoles = Array.isArray(to.meta.allowedRoles) ? to.meta.allowedRoles : null
      if (allowedRoles && !allowedRoles.includes(role)) {
        console.warn('[KW_ROUTE_GUARD] role forbidden -> dashboard', {
          role,
          allowedRoles,
          to: to.fullPath,
        })
        return { name: 'dashboard' }
      }
    } catch {
      await signOutUser()
      console.error('[KW_ROUTE_GUARD] status check failed -> login')
      return { name: 'login', query: { pending: '1', reason: 'status-check-failed' } }
    }
  }

  return true
})

export default router
