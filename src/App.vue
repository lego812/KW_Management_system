<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { LayoutDashboard, LogOut, NotebookPen, UserRound, Users } from 'lucide-vue-next'
import { getMemberStatusDetail, signOutUser } from './api/auth'
import { useAuthStore } from './stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { isLoggedIn, user } = storeToRefs(authStore)
const currentRole = ref('USER')

const isLoginPage = computed(() => route.name === 'login')
const sectionTitle = computed(() => route.meta.section ?? 'KW SYSTEM')
const sectionDescription = computed(() => route.meta.description ?? '사이드바에서 원하는 메뉴를 선택해 작업하세요.')

const navItems = [
  { to: '/', label: '유저 현황', icon: UserRound, roles: ['ADMIN', 'COACH'] },
  { to: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { to: '/players', label: '선수 관리', icon: Users },
  { to: '/tactics', label: '전술 관리', icon: NotebookPen },
]

const visibleNavItems = computed(() =>
  navItems.filter((item) => !item.roles || item.roles.includes(currentRole.value)),
)

const navIconSize = Number.parseInt(
  getComputedStyle(document.documentElement).getPropertyValue('--kw-icon-nav') || '14',
  10,
)
const navIconStroke = Number.parseFloat(
  getComputedStyle(document.documentElement).getPropertyValue('--kw-icon-stroke') || '1.9',
)

async function onLogout() {
  try {
    await signOutUser()
  } catch (error) {
    console.error(error)
  } finally {
    router.push('/login')
  }
}

watch(
  user,
  async (nextUser) => {
    if (!nextUser) {
      currentRole.value = 'USER'
      return
    }

    try {
      const detail = await getMemberStatusDetail(nextUser.uid)
      currentRole.value = detail?.role ?? 'USER'
    } catch {
      currentRole.value = 'USER'
    }
  },
  { immediate: true },
)
</script>

<template>
  <main v-if="isLoginPage" class="login-shell">
    <section class="login-frame">
      <router-view />
    </section>
  </main>

  <div v-else class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="dot" />
        <div>
          <p class="kicker">KW SYSTEM</p>
          <strong>사이드바</strong>
        </div>
      </div>

      <nav class="nav">
        <router-link
          v-for="item in visibleNavItems"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          :class="{ active: route.path === item.to }"
        >
          <span class="nav-icon">
            <component :is="item.icon" :size="navIconSize" :stroke-width="navIconStroke" />
          </span>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <button v-if="isLoggedIn" class="logout-btn" @click="onLogout">
        <LogOut :size="14" :stroke-width="navIconStroke" />
        로그아웃
      </button>
    </aside>

    <section class="content-wrap">
      <header class="top-copy">
        <p class="section-kicker"><span class="dot bullet" />{{ sectionTitle }}</p>
        <p class="section-desc">{{ sectionDescription }}</p>
      </header>
      <div class="content-frame">
        <router-view />
      </div>
    </section>
  </div>
</template>

<style scoped>
.login-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: linear-gradient(180deg, var(--kw-bg-start) 0%, var(--kw-bg-end) 100%);
}

.login-frame {
  width: min(640px, 100%);
}

.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 240px 1fr;
  background: linear-gradient(180deg, var(--kw-bg-start) 0%, var(--kw-bg-end) 100%);
  color: var(--kw-text);
}

.sidebar {
  padding: 28px 18px;
  border-right: 1px solid color-mix(in srgb, var(--kw-text) 8%, transparent);
  background: var(--kw-sidebar);
  backdrop-filter: blur(2px);
  display: flex;
  flex-direction: column;
  color: #e5e7eb;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 22px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--kw-line-strong);
}

.kicker {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.09em;
  color: #9ca3af;
}

.brand strong {
  font-size: 22px;
}

.nav {
  display: grid;
  gap: 8px;
  margin-top: 8px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  text-decoration: none;
  color: #cbd5e1;
  border: 1px solid transparent;
}

.nav-icon {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-size: 12px;
}

.nav-link:hover,
.nav-link.active {
  background: rgba(255, 255, 255, 0.09);
  border-color: rgba(255, 255, 255, 0.16);
  color: #ffffff;
}

.content-wrap {
  padding: 28px;
}

.top-copy p {
  margin: 0;
}

.section-kicker {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  color: #a3a3a3;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.section-desc {
  margin: 0 0 16px;
  font-size: 28px;
  font-weight: 500;
  color: var(--kw-text-muted);
  line-height: 1.35;
}

.bullet {
  width: 11px;
  height: 11px;
}

.content-frame {
  background: color-mix(in srgb, var(--kw-surface-muted) 95%, transparent);
  border-radius: calc(var(--kw-radius-lg) + 12px);
  border: 1px solid color-mix(in srgb, var(--kw-text) 8%, transparent);
  min-height: calc(100vh - 130px);
  color: var(--kw-text);
  overflow: auto;
  box-shadow: var(--kw-shadow-frame);
}

.logout-btn {
  margin-top: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: var(--kw-radius-sm);
  border: 1px solid var(--kw-success-line);
  background: var(--kw-success-bg);
  color: var(--kw-success-text);
  font-size: 13px;
  font-weight: 600;
  width: fit-content;
  cursor: pointer;
}

@media (max-width: 960px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    border-right: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .top-copy p {
    font-size: 20px;
  }

  .section-kicker {
    font-size: 18px;
  }

  .section-desc {
    font-size: 18px;
  }

  .content-wrap {
    padding: 16px;
  }

  .content-frame {
    min-height: 70vh;
    border-radius: 18px;
  }
}
</style>
