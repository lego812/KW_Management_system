<script setup>
import { computed, onMounted, ref } from 'vue'
import { Plus, RefreshCw, Users } from 'lucide-vue-next'
import { createPlayer, fetchPlayers } from '../api/players'

const keyword = ref('')
const loading = ref(false)
const errorMessage = ref('')
const players = ref([])

const filteredPlayers = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  if (!q) return players.value
  return players.value.filter((p) => {
    const positions = Array.isArray(p.positions) ? p.positions.join(',').toLowerCase() : ''
    return (
      String(p.name ?? '').toLowerCase().includes(q) ||
      positions.includes(q) ||
      String(p.number ?? '').includes(q)
    )
  })
})

async function loadPlayers() {
  loading.value = true
  errorMessage.value = ''
  try {
    players.value = await fetchPlayers()
  } catch (error) {
    errorMessage.value = error?.message ?? '선수 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function onAddPlayer() {
  loading.value = true
  errorMessage.value = ''
  try {
    await createPlayer({
      name: `New Player ${Date.now().toString().slice(-4)}`,
      number: Math.floor(Math.random() * 99) + 1,
      positions: ['WR'],
      age: 20,
      studentNo: `${Date.now().toString().slice(-8)}`,
      department: 'Undeclared',
    })
    await loadPlayers()
  } catch (error) {
    errorMessage.value = error?.message ?? '선수 등록에 실패했습니다.'
  } finally {
    loading.value = false
  }
}

onMounted(loadPlayers)
</script>

<template>
  <main class="page">
    <header class="panel header-panel">
      <p class="eyebrow">Player Management</p>
      <h1><Users :size="22" :stroke-width="1.9" />선수 관리</h1>
      <p class="sub">선수 조회, 검색, 등록을 동일한 레이아웃에서 처리합니다.</p>
    </header>

    <section class="panel">
      <div class="toolbar">
        <input v-model="keyword" type="text" placeholder="이름, 번호, 포지션 검색">
        <button type="button" :disabled="loading" class="primary" @click="onAddPlayer">
          <Plus :size="14" :stroke-width="1.9" />선수 추가
        </button>
        <button type="button" :disabled="loading" @click="loadPlayers">
          <RefreshCw :size="14" :stroke-width="1.9" />새로고침
        </button>
      </div>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>번호</th>
              <th>이름</th>
              <th>포지션</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="player in filteredPlayers" :key="player.id">
              <td>{{ player.number }}</td>
              <td>{{ player.name }}</td>
              <td>{{ (player.positions || []).join(', ') }}</td>
              <td>
                <span class="status" :class="{ deleted: player.isDeleted }">
                  {{ player.isDeleted ? '삭제됨' : '활성' }}
                </span>
              </td>
            </tr>
            <tr v-if="!loading && filteredPlayers.length === 0">
              <td colspan="4">데이터가 없습니다.</td>
            </tr>
          </tbody>
        </table>
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

.header-panel h1 {
  margin: 6px 0 8px;
  font-size: 28px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sub {
  margin: 0;
  color: var(--kw-text-muted);
}

.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.toolbar input {
  flex: 1;
  height: 40px;
  border: 1px solid var(--kw-line-strong);
  border-radius: var(--kw-radius-sm);
  padding: 0 12px;
}

.toolbar button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  border: 1px solid var(--kw-line-strong);
  border-radius: var(--kw-radius-sm);
  padding: 0 12px;
  background: var(--kw-surface);
}

.toolbar .primary {
  background: var(--kw-primary);
  border-color: var(--kw-primary);
  color: var(--kw-primary-contrast);
}

.error {
  margin: 0 0 12px;
  color: var(--kw-danger-text);
  font-size: 13px;
}

.table-wrap {
  border: 1px solid var(--kw-line);
  border-radius: var(--kw-radius-md);
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 11px 12px;
  border-bottom: 1px solid #eceff3;
  text-align: left;
  font-size: 14px;
}

th {
  background: var(--kw-surface-muted);
  color: var(--kw-text-muted);
  font-weight: 600;
}

.status {
  display: inline-block;
  border: 1px solid var(--kw-success-line);
  background: var(--kw-success-bg);
  color: var(--kw-success-text);
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 12px;
}

.status.deleted {
  border-color: var(--kw-danger-line);
  background: var(--kw-danger-bg);
  color: #991b1b;
}

@media (max-width: 860px) {
  .toolbar {
    flex-direction: column;
  }
}
</style>
