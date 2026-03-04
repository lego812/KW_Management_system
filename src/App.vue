<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { onAuthStateChanged } from 'firebase/auth'
import { LayoutDashboard, LogIn, NotebookPen, Users } from 'lucide-vue-next'
import { auth, hasFirebaseConfig } from './plugins/firebase'

const isLoggedIn = ref(false)
const route = useRoute()
let unsubscribe
const sectionTitle = computed(() => route.meta.section ?? 'KW SYSTEM')
const sectionDescription = computed(
  () => route.meta.description ?? '사이드바를 축소하면 더 효율적으로 콘텐츠를 확인할 수 있습니다.',
)

const navItems = [
  { to: '/', label: '대시보드', icon: LayoutDashboard },
  { to: '/players', label: '선수 관리', icon: Users },
  { to: '/tactics', label: '전술 관리', icon: NotebookPen },
  { to: '/login', label: '로그인', icon: LogIn },
]
const navIconSize = Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue('--kw-icon-nav') || '14', 10)
const navIconStroke = Number.parseFloat(
  getComputedStyle(document.documentElement).getPropertyValue('--kw-icon-stroke') || '1.9',
)

onMounted(() => {
  if (!hasFirebaseConfig || !auth) return
  unsubscribe = onAuthStateChanged(auth, (user) => {
    isLoggedIn.value = !!user
  })
})

onBeforeUnmount(() => {
  unsubscribe?.()
})
</script>

<template>
  <div class="app-shell">
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
          v-for="item in navItems"
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

      <div v-if="isLoggedIn" class="login-badge">로그인 완료</div>
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

.login-badge {
  margin-top: auto;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid var(--kw-success-line);
  background: var(--kw-success-bg);
  color: var(--kw-success-text);
  font-size: 13px;
  font-weight: 600;
  width: fit-content;
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
