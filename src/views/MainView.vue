<script setup>
import { computed, onMounted, ref } from 'vue'
import { PieChart, Users } from 'lucide-vue-next'
import { fetchPlayers } from '../api/players'

const OFFENSE_ORDER = ['QB', 'RB', 'OL', 'TE', 'WR']
const DEFENSE_ORDER = ['DL', 'LB', 'C', 'S']
const PIE_COLORS = ['#0f172a', '#334155', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0']

const loading = ref(false)
const errorMessage = ref('')
const players = ref([])

const offenseViewMode = ref('table')
const defenseViewMode = ref('table')
const studentNoViewMode = ref('table')

const totalPlayers = computed(() => players.value.length)
const offenseAssigned = computed(() => players.value.filter((p) => (p.offensePositions || []).length > 0).length)
const defenseAssigned = computed(() => players.value.filter((p) => (p.defensePositions || []).length > 0).length)

const offenseStats = computed(() => buildPositionStats(players.value, 'offensePositions', OFFENSE_ORDER))
const defenseStats = computed(() => buildPositionStats(players.value, 'defensePositions', DEFENSE_ORDER))
const studentNoStats = computed(() => buildStudentNoStats(players.value))

function buildPositionStats(rows, key, order) {
  const counter = new Map(order.map((label) => [label, 0]))
  for (const p of rows) {
    const value = Array.isArray(p[key]) ? p[key][0] : null
    if (value && counter.has(value)) counter.set(value, counter.get(value) + 1)
  }
  return [...counter.entries()].map(([label, count]) => ({ label, count }))
}

function buildStudentNoStats(rows) {
  const counter = new Map()
  for (const p of rows) {
    const k = String(p.studentNo ?? '').trim() || '미입력'
    counter.set(k, (counter.get(k) ?? 0) + 1)
  }
  return [...counter.entries()]
    .sort((a, b) => {
      if (a[0] === '미입력') return 1
      if (b[0] === '미입력') return -1
      return Number(a[0]) - Number(b[0])
    })
    .map(([label, count]) => ({ label, count }))
}

function pieStyle(items) {
  const total = items.reduce((acc, item) => acc + item.count, 0)
  if (!items.length || total === 0) return { background: '#e2e8f0' }

  let current = 0
  const segs = items.map((it, idx) => {
    const next = current + (it.count / total) * 360
    const seg = `${PIE_COLORS[idx % PIE_COLORS.length]} ${current}deg ${next}deg`
    current = next
    return seg
  })
  return { background: `conic-gradient(${segs.join(', ')})` }
}

async function loadDashboardStats() {
  loading.value = true
  errorMessage.value = ''
  try {
    players.value = await fetchPlayers()
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
      <p class="eyebrow">Player Dashboard</p>
      <h1><Users :size="20" :stroke-width="1.9" />선수 통계 대시보드</h1>
      <p class="sub">선수 데이터 기반 집계 통계를 확인합니다.</p>
    </header>

    <p v-if="errorMessage" class="error panel">{{ errorMessage }}</p>

    <section class="summary-grid">
      <article class="panel stat-card"><h2>총 선수 수</h2><strong>{{ loading ? '...' : `${totalPlayers}명` }}</strong></article>
      <article class="panel stat-card"><h2>오펜스 지정 선수</h2><strong>{{ loading ? '...' : `${offenseAssigned}명` }}</strong></article>
      <article class="panel stat-card"><h2>디펜스 지정 선수</h2><strong>{{ loading ? '...' : `${defenseAssigned}명` }}</strong></article>
    </section>

    <section class="analytics-grid">
      <article class="panel block-card">
        <div class="block-head">
          <h2><PieChart :size="16" :stroke-width="1.9" />오펜스 포지션</h2>
          <select v-model="offenseViewMode" class="mode-select"><option value="table">표</option><option value="pie">원그래프</option></select>
        </div>
        <div v-if="offenseViewMode === 'table'" class="table-wrap">
          <table><thead><tr><th>포지션</th><th>인원</th></tr></thead><tbody><tr v-for="item in offenseStats" :key="`off-${item.label}`"><td>{{ item.label }}</td><td>{{ item.count }}</td></tr></tbody></table>
        </div>
        <div v-else class="pie-wrap">
          <div class="pie" :style="pieStyle(offenseStats)" />
          <ul class="legend"><li v-for="(item, idx) in offenseStats" :key="`off-l-${item.label}`"><span class="dot" :style="{ background: PIE_COLORS[idx % PIE_COLORS.length] }" />{{ item.label }} ({{ item.count }}명)</li></ul>
        </div>
      </article>

      <article class="panel block-card">
        <div class="block-head">
          <h2><PieChart :size="16" :stroke-width="1.9" />디펜스 포지션</h2>
          <select v-model="defenseViewMode" class="mode-select"><option value="table">표</option><option value="pie">원그래프</option></select>
        </div>
        <div v-if="defenseViewMode === 'table'" class="table-wrap">
          <table><thead><tr><th>포지션</th><th>인원</th></tr></thead><tbody><tr v-for="item in defenseStats" :key="`def-${item.label}`"><td>{{ item.label }}</td><td>{{ item.count }}</td></tr></tbody></table>
        </div>
        <div v-else class="pie-wrap">
          <div class="pie" :style="pieStyle(defenseStats)" />
          <ul class="legend"><li v-for="(item, idx) in defenseStats" :key="`def-l-${item.label}`"><span class="dot" :style="{ background: PIE_COLORS[idx % PIE_COLORS.length] }" />{{ item.label }} ({{ item.count }}명)</li></ul>
        </div>
      </article>

      <article class="panel block-card">
        <div class="block-head">
          <h2><PieChart :size="16" :stroke-width="1.9" />학번 비율</h2>
          <select v-model="studentNoViewMode" class="mode-select"><option value="table">표</option><option value="pie">원그래프</option></select>
        </div>
        <div v-if="studentNoViewMode === 'table'" class="table-wrap">
          <table><thead><tr><th>학번</th><th>인원</th></tr></thead><tbody><tr v-for="item in studentNoStats" :key="`sn-${item.label}`"><td>{{ item.label }}</td><td>{{ item.count }}</td></tr></tbody></table>
        </div>
        <div v-else class="pie-wrap">
          <div class="pie" :style="pieStyle(studentNoStats)" />
          <ul class="legend"><li v-for="(item, idx) in studentNoStats" :key="`sn-l-${item.label}`"><span class="dot" :style="{ background: PIE_COLORS[idx % PIE_COLORS.length] }" />{{ item.label }} ({{ item.count }}명)</li></ul>
        </div>
      </article>
    </section>
  </main>
</template>

<style scoped>
.page { max-width: 1180px; margin: 0 auto; padding: 24px 16px 32px; display: grid; gap: 12px; }
.panel { background: var(--kw-surface); border: 1px solid var(--kw-line); border-radius: var(--kw-radius-lg); padding: 18px; box-shadow: var(--kw-shadow-card); }
.eyebrow { margin: 0; font-size: 12px; letter-spacing: 0.08em; color: var(--kw-text-soft); text-transform: uppercase; }
.header-block h1 { margin: 6px 0 8px; font-size: 28px; display: flex; align-items: center; gap: 8px; }
.sub { margin: 0; color: var(--kw-text-muted); }
.error { margin: 0; color: var(--kw-danger-text); font-size: 13px; }

.summary-grid { display: grid; grid-template-columns: repeat(3, minmax(160px, 1fr)); gap: 12px; }
.stat-card h2 { margin: 0; font-size: 13px; color: var(--kw-text-soft); font-weight: 500; }
.stat-card strong { display: block; margin-top: 8px; font-size: 30px; line-height: 1; }

.analytics-grid { display: grid; grid-template-columns: repeat(3, minmax(260px, 1fr)); gap: 12px; }
.block-card { display: grid; gap: 10px; }
.block-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.block-head h2 { margin: 0; font-size: 15px; display: flex; align-items: center; gap: 6px; }
.mode-select { height: 32px; border: 1px solid var(--kw-line-strong); border-radius: 8px; background: #fff; padding: 0 8px; }

.table-wrap { border: 1px solid var(--kw-line); border-radius: var(--kw-radius-md); overflow: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 8px 10px; border-bottom: 1px solid #eceff3; text-align: left; font-size: 13px; }
th { background: var(--kw-surface-muted); color: var(--kw-text-muted); font-weight: 600; }

.pie-wrap { display: grid; gap: 10px; }
.pie { width: 130px; height: 130px; border-radius: 50%; border: 1px solid var(--kw-line); margin: 0 auto; }
.legend { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.legend li { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.dot { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }

@media (max-width: 980px) {
  .summary-grid, .analytics-grid { grid-template-columns: 1fr; }
}
</style>
