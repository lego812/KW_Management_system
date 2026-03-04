<script setup>
import { onMounted, ref, watch } from 'vue'
import { createTacticBoard, fetchTactics, saveBoardVersion } from '../api/tactics'

const category = ref('ALL')
const loading = ref(false)
const errorMessage = ref('')
const tactics = ref([])

async function loadTactics() {
  loading.value = true
  errorMessage.value = ''
  try {
    tactics.value = await fetchTactics(category.value)
  } catch (error) {
    errorMessage.value = error?.message ?? '전술 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function onCreateTactic() {
  loading.value = true
  errorMessage.value = ''
  try {
    await createTacticBoard({
      title: `New Tactic ${new Date().toISOString().slice(11, 19)}`,
      category: category.value === 'ALL' ? 'OFFENSE' : category.value,
      tags: ['new'],
    })
    await loadTactics()
  } catch (error) {
    errorMessage.value = error?.message ?? '전술 생성에 실패했습니다.'
  } finally {
    loading.value = false
  }
}

async function onSaveVersion(boardId) {
  loading.value = true
  errorMessage.value = ''
  try {
    await saveBoardVersion(boardId)
  } catch (error) {
    errorMessage.value = error?.message ?? '버전 저장에 실패했습니다.'
  } finally {
    loading.value = false
  }
}

watch(category, loadTactics)
onMounted(loadTactics)
</script>

<template>
  <main class="page">
    <header class="header">
      <h1>전술 관리</h1>
      <p>Firestore 전술 보드 목록</p>
    </header>

    <section class="toolbar">
      <select v-model="category">
        <option value="ALL">전체</option>
        <option value="OFFENSE">OFFENSE</option>
        <option value="DEFENSE">DEFENSE</option>
      </select>
      <button type="button" :disabled="loading" @click="onCreateTactic">+ 전술 생성</button>
      <button type="button" :disabled="loading" @click="loadTactics">새로고침</button>
    </section>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <section class="grid">
      <article v-for="item in tactics" :key="item.id" class="card">
        <h2>{{ item.title }}</h2>
        <p>카테고리: {{ item.category }}</p>
        <p>상태: {{ item.status }}</p>
        <p>버전: {{ item.lastPublishedVersion ?? 0 }}</p>
        <div class="actions">
          <button type="button">열기</button>
          <button type="button" :disabled="loading" @click="onSaveVersion(item.id)">버전 저장</button>
        </div>
      </article>
      <article v-if="!loading && tactics.length === 0" class="card">
        <h2>전술이 없습니다.</h2>
        <p>첫 전술 보드를 생성해보세요.</p>
      </article>
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

.toolbar select,
.toolbar button {
  height: 38px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0 10px;
  background: #ffffff;
}

.error {
  margin: 0 0 12px;
  color: #b91c1c;
  font-size: 13px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.card {
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 14px;
}

.card h2 {
  margin: 0 0 8px;
  font-size: 16px;
}

.card p {
  margin: 4px 0;
  color: #374151;
  font-size: 14px;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.actions button {
  height: 34px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0 10px;
  background: #ffffff;
}
</style>
