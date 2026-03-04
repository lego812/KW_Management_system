<script setup>
import { computed, onMounted, ref } from 'vue'
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
    <header class="header">
      <h1>선수 관리</h1>
      <p>Firestore 선수 목록</p>
    </header>

    <section class="toolbar">
      <input v-model="keyword" type="text" placeholder="이름, 번호, 포지션 검색" />
      <button type="button" :disabled="loading" @click="onAddPlayer">+ 선수 추가</button>
      <button type="button" :disabled="loading" @click="loadPlayers">새로고침</button>
    </section>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <section class="table-wrap">
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
            <td>{{ player.isDeleted ? '삭제됨' : '활성' }}</td>
          </tr>
          <tr v-if="!loading && filteredPlayers.length === 0">
            <td colspan="4">데이터가 없습니다.</td>
          </tr>
        </tbody>
      </table>
    </section>
  </main>
</template>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 16px;
}

.header h1 {
  margin: 0;
}

.header p {
  margin: 8px 0 16px;
  color: #4b5563;
}

.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.toolbar input {
  flex: 1;
  height: 38px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0 10px;
}

.toolbar button {
  height: 38px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0 12px;
  background: #ffffff;
}

.error {
  margin: 0 0 12px;
  color: #b91c1c;
  font-size: 13px;
}

.table-wrap {
  border: 1px solid #d1d5db;
  border-radius: 10px;
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 10px;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
}
</style>
