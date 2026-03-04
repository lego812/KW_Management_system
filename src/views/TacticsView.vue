<script setup>
import { onMounted, ref, watch } from 'vue'
import { ListFilter, NotebookPen, Plus, RefreshCw, Save } from 'lucide-vue-next'
import { createTacticBoard, fetchTactics, saveBoardVersion } from '../api/tactics'

const category = ref('ALL')
const loading = ref(false)
const errorMessage = ref('')
const tactics = ref([])

const steps = ['기본정보', '포메이션 선택', '플레이 라인 설정', '시뮬레이션 설정', '최종 저장']
const currentStep = ref(1)

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
    <header class="header panel">
      <p class="eyebrow">Tactic Register/Edit</p>
      <h1><NotebookPen :size="22" :stroke-width="1.9" />전술 등록/수정</h1>
      <p>Progress Bar를 활용해 등록 과정을 한눈에 확인할 수 있습니다.</p>
    </header>

    <section class="step-wrap">
      <ol class="steps">
        <li v-for="(step, index) in steps" :key="step" class="step" :class="{ active: index <= currentStep }">
          <span class="step-index">{{ index + 1 }}</span>
          <span>{{ step }}</span>
        </li>
      </ol>
    </section>

    <section class="form-card panel">
      <h2>기본정보</h2>
      <div class="form-grid">
        <label>
          <span>전술명</span>
          <input type="text" placeholder="예: Week3 Redzone Pass">
        </label>
        <label>
          <span>카테고리</span>
          <select v-model="category">
            <option value="ALL">전체</option>
            <option value="OFFENSE">OFFENSE</option>
            <option value="DEFENSE">DEFENSE</option>
          </select>
        </label>
        <label>
          <span>태그</span>
          <input type="text" placeholder="redzone, pass">
        </label>
        <label>
          <span>포메이션</span>
          <input type="text" placeholder="I-Formation">
        </label>
      </div>
      <div class="form-actions">
        <button type="button"><Save :size="14" :stroke-width="1.9" />임시 저장</button>
        <button type="button" @click="currentStep = Math.min(currentStep + 1, steps.length - 1)">
          저장 후 다음단계
        </button>
      </div>
    </section>

    <section class="toolbar panel">
      <button type="button" :disabled="loading" @click="onCreateTactic">
        <Plus :size="14" :stroke-width="1.9" />전술 생성
      </button>
      <button type="button" :disabled="loading" @click="loadTactics">
        <RefreshCw :size="14" :stroke-width="1.9" />새로고침
      </button>
      <label class="category-filter">
        <ListFilter :size="14" :stroke-width="1.9" />
        <select v-model="category">
          <option value="ALL">전체</option>
          <option value="OFFENSE">OFFENSE</option>
          <option value="DEFENSE">DEFENSE</option>
        </select>
      </label>
    </section>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <section class="grid">
      <article v-for="item in tactics" :key="item.id" class="card panel">
        <h2>{{ item.title }}</h2>
        <p>카테고리: {{ item.category }}</p>
        <p>상태: {{ item.status }}</p>
        <p>버전: {{ item.lastPublishedVersion ?? 0 }}</p>
        <div class="actions">
          <button type="button">열기</button>
          <button type="button" :disabled="loading" @click="onSaveVersion(item.id)">버전 저장</button>
        </div>
      </article>
      <article v-if="!loading && tactics.length === 0" class="card panel">
        <h2>전술이 없습니다.</h2>
        <p>첫 전술 보드를 생성해보세요.</p>
      </article>
    </section>
  </main>
</template>

<style scoped>
.page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 24px 16px 32px;
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

.header h1 {
  margin: 6px 0 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.header p {
  margin: 0;
  color: var(--kw-text-muted);
}

.step-wrap {
  margin: 12px 0;
}

.steps {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(5, minmax(120px, 1fr));
  gap: 8px;
}

.step {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid var(--kw-line-strong);
  background: var(--kw-surface-muted);
  color: var(--kw-text-soft);
  font-size: 13px;
}

.step.active {
  border-color: var(--kw-text-muted);
  background: var(--kw-surface);
  color: var(--kw-text);
}

.step-index {
  display: inline-grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid currentColor;
  font-size: 11px;
}

.form-card {
  margin-bottom: 12px;
}

.form-card h2 {
  margin: 0 0 12px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(200px, 1fr));
  gap: 10px;
}

.form-grid label {
  display: grid;
  gap: 6px;
}

.form-grid span {
  font-size: 12px;
  color: var(--kw-text-soft);
}

.form-grid input,
.form-grid select {
  height: 38px;
  border: 1px solid var(--kw-line-strong);
  border-radius: 8px;
  padding: 0 10px;
  background: #ffffff;
}

.form-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.form-actions button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  border: 1px solid var(--kw-line-strong);
  border-radius: 8px;
  padding: 0 12px;
  background: var(--kw-surface);
}

.form-actions button:last-child {
  background: var(--kw-primary);
  color: var(--kw-primary-contrast);
  border-color: var(--kw-primary);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.toolbar button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  border: 1px solid var(--kw-line-strong);
  border-radius: 8px;
  padding: 0 10px;
  background: var(--kw-surface);
}

.category-filter {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--kw-text-muted);
}

.category-filter select {
  height: 36px;
  border: 1px solid var(--kw-line-strong);
  border-radius: 8px;
  padding: 0 10px;
}

.error {
  margin: 0 0 12px;
  color: var(--kw-danger-text);
  font-size: 13px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.card {
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

@media (max-width: 860px) {
  .steps {
    grid-template-columns: 1fr;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .category-filter {
    margin-left: 0;
  }
}
</style>
