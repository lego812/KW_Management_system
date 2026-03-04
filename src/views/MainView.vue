<script setup>
import { computed, onMounted, ref } from 'vue'
import { LogIn, NotebookPen, ShieldCheck, Users, Waypoints } from 'lucide-vue-next'
import { fetchPlayers } from '../api/players'
import { fetchTactics } from '../api/tactics'
import { listUsers } from '../api/users'

const loading = ref(false)
const errorMessage = ref('')
const approvedUsers = ref(0)
const totalUsers = ref(0)
const playersCount = ref(0)
const tacticsCount = ref(0)

const approvedUsersLabel = computed(() => (loading.value ? '...' : `${approvedUsers.value}명`))
const playersLabel = computed(() => (loading.value ? '...' : `${playersCount.value}명`))
const tacticsLabel = computed(() => (loading.value ? '...' : `${tacticsCount.value}개`))

async function loadDashboardStats() {
  loading.value = true
  errorMessage.value = ''

  try {
    const [members, players, tactics] = await Promise.all([
      listUsers(),
      fetchPlayers(),
      fetchTactics('ALL'),
    ])

    totalUsers.value = members.length
    approvedUsers.value = members.filter((m) => m.status === 'APPROVED').length
    playersCount.value = players.length
    tacticsCount.value = tactics.length
  } catch (error) {
    errorMessage.value = error?.message ?? '대시보드 통계를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

onMounted(loadDashboardStats)
</script>

<template>
  <main class="page">
    <header class="header-block panel">
      <div>
        <p class="eyebrow">메인 대시보드</p>
        <h1>KW 시스템 운영 현황</h1>
        <p class="sub">권한, 선수, 전술 데이터를 한 화면에서 빠르게 확인합니다.</p>
      </div>
    </header>

    <p v-if="errorMessage" class="error panel">{{ errorMessage }}</p>

    <section class="stats-grid">
      <article class="panel stat-card">
        <h2><ShieldCheck :size="16" :stroke-width="1.9" />승인 사용자</h2>
        <strong>{{ approvedUsersLabel }}</strong>
        <p>전체 사용자 {{ totalUsers }}명</p>
      </article>
      <article class="panel stat-card">
        <h2><Users :size="16" :stroke-width="1.9" />등록 선수</h2>
        <strong>{{ playersLabel }}</strong>
        <p>활성 선수 기준 집계</p>
      </article>
      <article class="panel stat-card">
        <h2><Waypoints :size="16" :stroke-width="1.9" />전술 보드</h2>
        <strong>{{ tacticsLabel }}</strong>
        <p>삭제 제외 보드 기준</p>
      </article>
    </section>

    <section class="panel nav-panel">
      <h2>바로가기</h2>
      <div class="menu-grid">
        <router-link class="menu-card" to="/login">
          <h3><LogIn :size="16" :stroke-width="1.9" />로그인 관리</h3>
          <p>인증 상태 확인 및 계정 접근</p>
        </router-link>
        <router-link class="menu-card" to="/players">
          <h3><Users :size="16" :stroke-width="1.9" />선수 관리</h3>
          <p>선수 조회, 추가, 상태 관리</p>
        </router-link>
        <router-link class="menu-card" to="/tactics">
          <h3><NotebookPen :size="16" :stroke-width="1.9" />전술 관리</h3>
          <p>전술 작성 및 버전 관리</p>
        </router-link>
      </div>
    </section>
  </main>
</template>

<style scoped>
.page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 24px 16px 32px;
  display: grid;
  gap: 12px;
}

.panel {
  background: var(--kw-surface);
  border: 1px solid var(--kw-line);
  border-radius: var(--kw-radius-lg);
  padding: 18px;
  box-shadow: var(--kw-shadow-card);
}

.eyebrow {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--kw-text-soft);
  text-transform: uppercase;
}

.header-block h1 {
  margin: 6px 0 8px;
  font-size: 28px;
}

.sub {
  margin: 0;
  color: var(--kw-text-muted);
}

.error {
  margin: 0;
  color: var(--kw-danger-text);
  font-size: 13px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(160px, 1fr));
  gap: 12px;
}

.stat-card h2 {
  margin: 0;
  font-size: 13px;
  color: var(--kw-text-soft);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.stat-card strong {
  display: block;
  margin-top: 8px;
  font-size: 30px;
  line-height: 1;
}

.stat-card p {
  margin: 10px 0 0;
  color: var(--kw-text-muted);
  font-size: 13px;
}

.nav-panel h2 {
  margin: 0 0 12px;
  font-size: 16px;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(180px, 1fr));
  gap: 10px;
}

.menu-card {
  border: 1px solid var(--kw-line);
  border-radius: var(--kw-radius-md);
  padding: 14px;
  text-decoration: none;
  color: var(--kw-text);
  background: var(--kw-surface-muted);
}

.menu-card:hover {
  border-color: var(--kw-primary);
}

.menu-card h3 {
  margin: 0;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.menu-card p {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--kw-text-muted);
}

@media (max-width: 900px) {
  .stats-grid,
  .menu-grid {
    grid-template-columns: 1fr;
  }
}
</style>
