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

  if (requiresAuth && !isAuthenticated) {
    return { name: 'login' }
  }

  if (requiresAuth && isAuthenticated) {
    try {
      const detail = await getMemberStatusDetail(authStore.user?.uid)
      const status = detail?.status ?? null
      const role = detail?.role ?? 'USER'
      if (status !== 'APPROVED') {
        await signOutUser()
        return { name: 'login', query: { pending: '1', status: String(status ?? '') } }
      }

      const allowedRoles = Array.isArray(to.meta.allowedRoles) ? to.meta.allowedRoles : null
      if (allowedRoles && !allowedRoles.includes(role)) {
        return { name: 'dashboard' }
      }
    } catch {
      await signOutUser()
      return { name: 'login', query: { pending: '1', reason: 'status-check-failed' } }
    }
  }

  return true
})

export default router
