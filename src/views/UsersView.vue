<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Check, RefreshCw, ShieldCheck, Users, UserRound } from 'lucide-vue-next'
import { approveMember, getMyMemberProfile, listUsers, updateMemberRole } from '../api/users'
import InlineMessage from '../components/common/InlineMessage.vue'
import PageHeaderPanel from '../components/common/PageHeaderPanel.vue'
import StatSummaryCard from '../components/common/StatSummaryCard.vue'

const loading = ref(false)
const errorMessage = ref('')
const users = ref([])
const myRole = ref('USER')
const myStatus = ref('PENDING')
const myUid = ref('')
const approveLoadingId = ref('')
const roleLoadingId = ref('')
const actionMessage = ref('')
let actionMessageTimer = null

const isAdmin = computed(() => myRole.value === 'ADMIN')
const totalCount = computed(() => users.value.length)
const approvedCount = computed(() => users.value.filter((u) => u.status === 'APPROVED').length)
const pendingCount = computed(() => users.value.filter((u) => u.status !== 'APPROVED').length)
const adminCount = computed(() => users.value.filter((u) => u.role === 'ADMIN').length)
const coachCount = computed(() => users.value.filter((u) => u.role === 'COACH').length)
const userCount = computed(() => users.value.filter((u) => u.role === 'USER').length)

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

function setActionMessage(message) {
  actionMessage.value = message
  if (actionMessageTimer) clearTimeout(actionMessageTimer)
  actionMessageTimer = setTimeout(() => {
    actionMessage.value = ''
    actionMessageTimer = null
  }, 5000)
}

async function loadUsers() {
  loading.value = true
  errorMessage.value = ''
  try {
    users.value = await listUsers()
  } catch (error) {
    errorMessage.value = error?.message ?? '유저 통계를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function loadMyProfile() {
  try {
    const me = await getMyMemberProfile()
    myRole.value = me?.role ?? 'USER'
    myStatus.value = me?.status ?? 'PENDING'
    myUid.value = me?.uid ?? ''
  } catch (error) {
    errorMessage.value = error?.message ?? '내 권한 정보를 확인하지 못했습니다.'
  }
}

async function onApprove(member) {
  if (!isAdmin.value || member.status === 'APPROVED') return

  approveLoadingId.value = member.id
  errorMessage.value = ''

  try {
    await approveMember(member.id)
    setActionMessage(`${member.name || member.email || member.id} 계정을 승인했습니다.`)
    await loadUsers()
  } catch (error) {
    errorMessage.value = error?.message ?? '승인 처리에 실패했습니다.'
  } finally {
    approveLoadingId.value = ''
  }
}

async function onChangeRole(member, nextRole) {
  if (!isAdmin.value) return
  if (!member?.id || member.id === myUid.value || member.role === 'ADMIN') return
  if (!['COACH', 'USER'].includes(String(nextRole))) return
  if (String(member.role) === String(nextRole)) return
  roleLoadingId.value = member.id
  errorMessage.value = ''
  try {
    await updateMemberRole(member.id, nextRole)
    setActionMessage(`${member.name || member.email || member.id} 권한을 ${nextRole}(으)로 변경했습니다.`)
    await loadUsers()
  } catch (error) {
    errorMessage.value = error?.message ?? '권한 변경에 실패했습니다.'
  } finally {
    roleLoadingId.value = ''
  }
}

onMounted(async () => {
  await loadMyProfile()
  await loadUsers()
})

onBeforeUnmount(() => {
  if (actionMessageTimer) {
    clearTimeout(actionMessageTimer)
    actionMessageTimer = null
  }
})
</script>

<template>
  <main class="page">
    <PageHeaderPanel
      eyebrow="User Overview"
      title="유저 통합 현황"
      subtitle="유저 승인 상태와 권한 분포를 확인합니다."
      :meta="`내 권한: ${myRole} / 내 상태: ${myStatus}`"
      :icon="UserRound"
    />

    <section class="stats-grid">
      <StatSummaryCard label="전체" :value="`${totalCount}명`" :icon="Users" />
      <StatSummaryCard label="승인" :value="`${approvedCount}명`" :icon="ShieldCheck" />
      <StatSummaryCard label="대기" :value="`${pendingCount}명`" :icon="ShieldCheck" />
      <StatSummaryCard label="ADMIN" :value="`${adminCount}명`" :icon="ShieldCheck" />
      <StatSummaryCard label="COACH" :value="`${coachCount}명`" :icon="ShieldCheck" />
      <StatSummaryCard label="USER" :value="`${userCount}명`" :icon="ShieldCheck" />
    </section>

    <section class="panel">
      <div class="toolbar">
        <strong>유저 목록</strong>
        <button type="button" :disabled="loading" @click="loadUsers">
          <RefreshCw :size="14" :stroke-width="1.9" />새로고침
        </button>
      </div>

      <InlineMessage :message="!isAdmin ? '관리자 권한이 아니면 승인 버튼이 보이지 않습니다.' : ''" type="notice" />
      <InlineMessage :message="errorMessage" type="error" />
      <InlineMessage :message="actionMessage" type="success" />

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
              <td>
                <div class="role-cell">
                  <template v-if="isAdmin && member.id !== myUid && member.role !== 'ADMIN'">
                    <select
                      class="role-select"
                      :value="member.role"
                      :disabled="roleLoadingId === member.id"
                      @change="onChangeRole(member, $event.target.value)"
                    >
                      <option value="COACH">COACH</option>
                      <option value="USER">USER</option>
                    </select>
                  </template>
                  <span v-else>{{ member.role }}</span>
                </div>
              </td>
              <td><span class="status" :class="{ pending: member.status !== 'APPROVED' }">{{ member.status }}</span></td>
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
.page { max-width: 1080px; margin: 0 auto; padding: 24px 16px 32px; display: grid; gap: 12px; }
.panel { background: var(--kw-surface); border: 1px solid var(--kw-line); border-radius: var(--kw-radius-lg); padding: 18px; box-shadow: var(--kw-shadow-card); }

.stats-grid { display: grid; grid-template-columns: repeat(3, minmax(160px, 1fr)); gap: 12px; }

.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.toolbar button { display: inline-flex; align-items: center; gap: 6px; height: 36px; border: 1px solid var(--kw-line-strong); border-radius: var(--kw-radius-sm); padding: 0 12px; background: var(--kw-surface); }

.table-wrap { border: 1px solid var(--kw-line); border-radius: var(--kw-radius-md); overflow: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 11px 12px; border-bottom: 1px solid #eceff3; text-align: left; font-size: 14px; }
th { background: var(--kw-surface-muted); color: var(--kw-text-muted); font-weight: 600; }

.status { display: inline-block; border: 1px solid var(--kw-success-line); background: var(--kw-success-bg); color: var(--kw-success-text); border-radius: 999px; padding: 2px 8px; font-size: 12px; }
.status.pending { border-color: #f59e0b; background: #fff7ed; color: #b45309; }

.approve-btn { display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--kw-primary); border-radius: 8px; background: var(--kw-primary); color: var(--kw-primary-contrast); height: 30px; padding: 0 10px; }
.approve-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.dash { color: var(--kw-text-soft); }

.role-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.role-select {
  height: 28px;
  border: 1px solid var(--kw-line-strong);
  border-radius: 8px;
  background: #fff;
  padding: 0 8px;
  font-size: 12px;
}

@media (max-width: 960px) {
  .stats-grid { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 640px) {
  .stats-grid { grid-template-columns: 1fr; }
}
</style>
