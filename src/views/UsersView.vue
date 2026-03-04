<script setup>
import { computed, onMounted, ref } from 'vue'
import { Check, RefreshCw, ShieldCheck, Users, UserRound } from 'lucide-vue-next'
import { approveMember, getMyMemberProfile, listUsers } from '../api/users'

const loading = ref(false)
const errorMessage = ref('')
const users = ref([])
const myRole = ref('USER')
const myStatus = ref('PENDING')
const approveLoadingId = ref('')
const actionMessage = ref('')

const isAdmin = computed(() => myRole.value === 'ADMIN')
const totalCount = computed(() => users.value.length)
const approvedCount = computed(() => users.value.filter((u) => u.status === 'APPROVED').length)
const pendingCount = computed(() => users.value.filter((u) => u.status === 'PENDING').length)
const adminCount = computed(() => users.value.filter((u) => u.role === 'ADMIN').length)

function formatDate(value) {
  if (!value) return '-'
  const raw = typeof value?.toDate === 'function' ? value.toDate() : value
  const date = raw instanceof Date ? raw : new Date(raw)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

async function loadUsers() {
  loading.value = true
  errorMessage.value = ''
  try {
    users.value = await listUsers()
  } catch (error) {
    errorMessage.value = error?.message ?? '유저 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function loadMyProfile() {
  try {
    const me = await getMyMemberProfile()
    myRole.value = me?.role ?? 'USER'
    myStatus.value = me?.status ?? 'PENDING'
  } catch (error) {
    errorMessage.value = error?.message ?? '내 권한 정보를 확인하지 못했습니다.'
  }
}

async function onApprove(member) {
  if (!isAdmin.value || member.status === 'APPROVED') return

  approveLoadingId.value = member.id
  errorMessage.value = ''
  actionMessage.value = ''

  try {
    await approveMember(member.id)
    actionMessage.value = `${member.name || member.email || member.id} 계정을 승인했습니다.`
    await loadUsers()
  } catch (error) {
    errorMessage.value = error?.message ?? '승인 처리에 실패했습니다.'
  } finally {
    approveLoadingId.value = ''
  }
}

onMounted(async () => {
  await loadMyProfile()
  await loadUsers()
})
</script>

<template>
  <main class="page">
    <header class="panel header-panel">
      <p class="eyebrow">User Overview</p>
      <h1><UserRound :size="22" :stroke-width="1.9" />유저 통합 현황</h1>
      <p class="sub">조직 멤버의 권한, 승인 상태, 가입 시점을 한 화면에서 확인합니다.</p>
      <p class="meta">내 권한: {{ myRole }} / 내 상태: {{ myStatus }}</p>
    </header>

    <section class="stats-grid">
      <article class="panel stat-card">
        <h2><Users :size="16" :stroke-width="1.9" />전체 유저</h2>
        <strong>{{ totalCount }}명</strong>
      </article>
      <article class="panel stat-card">
        <h2><ShieldCheck :size="16" :stroke-width="1.9" />승인 완료</h2>
        <strong>{{ approvedCount }}명</strong>
      </article>
      <article class="panel stat-card">
        <h2><ShieldCheck :size="16" :stroke-width="1.9" />승인 대기</h2>
        <strong>{{ pendingCount }}명</strong>
      </article>
      <article class="panel stat-card">
        <h2><ShieldCheck :size="16" :stroke-width="1.9" />관리자</h2>
        <strong>{{ adminCount }}명</strong>
      </article>
    </section>

    <section class="panel">
      <div class="toolbar">
        <strong>유저 목록</strong>
        <button type="button" :disabled="loading" @click="loadUsers">
          <RefreshCw :size="14" :stroke-width="1.9" />새로고침
        </button>
      </div>

      <p v-if="!isAdmin" class="notice">현재 계정은 관리자 권한이 아니므로 승인 처리 버튼이 표시되지 않습니다.</p>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <p v-if="actionMessage" class="success">{{ actionMessage }}</p>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>이름</th>
              <th>이메일</th>
              <th>권한</th>
              <th>상태</th>
              <th>가입일</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in users" :key="member.id">
              <td>{{ member.name || '-' }}</td>
              <td>{{ member.email || '-' }}</td>
              <td>{{ member.role }}</td>
              <td>
                <span class="status" :class="{ pending: member.status !== 'APPROVED' }">
                  {{ member.status }}
                </span>
              </td>
              <td>{{ formatDate(member.createdAt) }}</td>
              <td>
                <button
                  v-if="isAdmin && member.status !== 'APPROVED'"
                  type="button"
                  class="approve-btn"
                  :disabled="approveLoadingId === member.id"
                  @click="onApprove(member)"
                >
                  <Check :size="14" :stroke-width="1.9" />
                  {{ approveLoadingId === member.id ? '처리 중...' : '승인' }}
                </button>
                <span v-else class="dash">-</span>
              </td>
            </tr>
            <tr v-if="!loading && users.length === 0">
              <td colspan="6">유저 데이터가 없습니다.</td>
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

.meta {
  margin: 10px 0 0;
  color: var(--kw-text-soft);
  font-size: 13px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, 1fr));
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
  font-size: 28px;
  line-height: 1;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.toolbar button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  border: 1px solid var(--kw-line-strong);
  border-radius: var(--kw-radius-sm);
  padding: 0 12px;
  background: var(--kw-surface);
}

.notice {
  margin: 0 0 10px;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 13px;
}

.error {
  margin: 0 0 12px;
  color: var(--kw-danger-text);
  font-size: 13px;
}

.success {
  margin: 0 0 12px;
  color: var(--kw-success-text);
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

.status.pending {
  border-color: #f59e0b;
  background: #fff7ed;
  color: #b45309;
}

.approve-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--kw-primary);
  border-radius: 8px;
  background: var(--kw-primary);
  color: var(--kw-primary-contrast);
  height: 30px;
  padding: 0 10px;
}

.approve-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dash {
  color: var(--kw-text-soft);
}

@media (max-width: 960px) {
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
