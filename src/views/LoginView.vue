<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import {
  createPendingMemberProfile,
  getMemberStatus,
  getMemberStatusDetail,
  signInByEmail,
  signInByGoogle,
  signOutUser,
  signUpByEmail,
} from '../api/auth'
import { useAuthStore } from '../stores/auth'

const form = reactive({
  displayName: '',
  email: '',
  password: '',
  passwordConfirm: '',
  rememberMe: true,
})

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { user } = storeToRefs(authStore)
const mode = ref('login')
const loading = ref(false)
const checkingStatus = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const showPendingModal = ref(false)
const currentUserEmail = computed(() => user.value?.email ?? '')

function resetMessages() {
  errorMessage.value = ''
  successMessage.value = ''
}

function closePendingModal() {
  showPendingModal.value = false
  if (route.query.pending === '1') {
    router.replace({ name: 'login' })
  }
}

function switchMode(nextMode) {
  mode.value = nextMode
  resetMessages()
}

function isPendingByPermissionError(error) {
  const code = String(error?.code ?? '')
  const message = String(error?.message ?? '')
  return code.includes('permission-denied') || /insufficient permissions/i.test(message)
}

async function verifyApprovedOrShowPending(targetUser) {
  checkingStatus.value = true
  try {
    const detail = await getMemberStatusDetail(targetUser?.uid)
    const status = await getMemberStatus(targetUser?.uid)
    if (status !== 'APPROVED') {
      await signOutUser()
      showPendingModal.value = true
      return false
    }
    return true
  } catch (error) {
    if (isPendingByPermissionError(error)) {
      await signOutUser()
      showPendingModal.value = true
      return false
    }
    throw error
  } finally {
    checkingStatus.value = false
  }
}

async function onSubmitLogin() {
  resetMessages()
  closePendingModal()
  loading.value = true
  try {
    const credential = await signInByEmail(form.email, form.password)
    const approved = await verifyApprovedOrShowPending(credential.user)
    if (approved) {
      await router.push('/')
    }
  } catch (error) {
    errorMessage.value = error?.message ?? '로그인에 실패했습니다.'
  } finally {
    loading.value = false
  }
}

async function onSubmitSignup() {
  resetMessages()

  if (!form.displayName.trim()) {
    errorMessage.value = '이름을 입력해주세요.'
    return
  }

  if (form.password !== form.passwordConfirm) {
    errorMessage.value = '비밀번호 확인이 일치하지 않습니다.'
    return
  }

  loading.value = true

  try {
    const credential = await signUpByEmail(form.email, form.password)
    await createPendingMemberProfile(credential.user, {
      displayName: form.displayName,
      email: form.email,
      role: 'USER',
    })
    await signOutUser()

    successMessage.value = '회원가입 요청이 접수되었습니다. 관리자 승인 후 로그인 가능합니다.'
    form.password = ''
    form.passwordConfirm = ''
    mode.value = 'login'
  } catch (error) {
    errorMessage.value = error?.message ?? '회원가입에 실패했습니다.'
  } finally {
    loading.value = false
  }
}

async function onGoogleLogin() {
  resetMessages()
  closePendingModal()
  loading.value = true
  try {
    const credential = await signInByGoogle()
    const approved = await verifyApprovedOrShowPending(credential.user)
    if (approved) {
      await router.push('/')
    }
  } catch (error) {
    errorMessage.value = error?.message ?? '구글 로그인에 실패했습니다.'
  } finally {
    loading.value = false
  }
}

watch(
  user,
  async (nextUser) => {
    if (!nextUser || mode.value !== 'login' || loading.value || checkingStatus.value) return
    try {
      const approved = await verifyApprovedOrShowPending(nextUser)
      if (approved) {
        await router.push('/')
      }
    } catch (error) {
      errorMessage.value = error?.message ?? '승인 상태를 확인하지 못했습니다.'
    }
  },
  { immediate: true },
)

watch(
  () => route.query.pending,
  (pending) => {
    if (pending === '1') {
      showPendingModal.value = true
    }
  },
  { immediate: true },
)
</script>

<template>
  <main class="page">
    <section class="panel auth-panel">
      <header class="header-block">
        <h1>{{ mode === 'login' ? '로그인' : '회원가입' }}</h1>
        <p v-if="currentUserEmail" class="signed-in">현재 사용자: {{ currentUserEmail }}</p>
      </header>

      <div class="mode-switch">
        <button type="button" :class="{ active: mode === 'login' }" @click="switchMode('login')">로그인</button>
        <button type="button" :class="{ active: mode === 'signup' }" @click="switchMode('signup')">
          회원가입
        </button>
      </div>

      <form v-if="mode === 'login'" class="form-grid" @submit.prevent="onSubmitLogin">
        <label class="field">
          <input v-model="form.email" type="email" placeholder="ID" required>
        </label>

        <label class="field">
          <input v-model="form.password" type="password" placeholder="PASSWORD" required>
        </label>

        <label class="checkbox remember">
          <input v-model="form.rememberMe" type="checkbox">
          <span>로그인 상태 유지</span>
        </label>

        <div class="actions">
          <button type="submit" :disabled="loading" class="primary block">
            {{ loading ? '처리 중...' : '로그인' }}
          </button>
          <button type="button" :disabled="loading" class="block ghost" @click="onGoogleLogin">
            Google로 로그인
          </button>
        </div>
      </form>

      <form v-else class="form-grid" @submit.prevent="onSubmitSignup">
        <label class="field">
          <input v-model="form.displayName" type="text" placeholder="이름" required>
        </label>

        <label class="field">
          <input v-model="form.email" type="email" placeholder="이메일" required>
        </label>

        <label class="field">
          <input v-model="form.password" type="password" placeholder="비밀번호" required>
        </label>

        <label class="field">
          <input v-model="form.passwordConfirm" type="password" placeholder="비밀번호 확인" required>
        </label>

        <div class="actions">
          <button type="submit" :disabled="loading" class="primary block">
            {{ loading ? '처리 중...' : '회원가입 요청' }}
          </button>
        </div>
      </form>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <p v-if="successMessage" class="success">{{ successMessage }}</p>
    </section>

    <div v-if="showPendingModal" class="modal-backdrop" @click.self="closePendingModal">
      <article class="modal-panel">
        <button type="button" class="modal-close" aria-label="닫기" @click="closePendingModal">×</button>
        <h2>관리자 승인 대기</h2>
        <p>아직 관리자 승인 대기 중입니다. 승인 완료 후 다시 로그인해주세요.</p>
      </article>
    </div>
  </main>
</template>

<style scoped>
.page {
  max-width: 760px;
  margin: 0 auto;
  padding: 24px 16px;
}

.panel {
  background: var(--kw-surface);
  border: 1px solid var(--kw-line);
  border-radius: var(--kw-radius-lg);
  padding: 18px;
  box-shadow: var(--kw-shadow-card);
}

.auth-panel {
  max-width: 540px;
  margin: 0 auto;
  padding: 30px 24px 24px;
  overflow: hidden;
}

.header-block h1 {
  margin: 0;
  font-size: 28px;
  text-align: center;
}

.signed-in {
  margin: 10px 0 0;
  text-align: center;
  color: #2563eb;
  font-size: 13px;
}

.mode-switch {
  margin-top: 14px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.mode-switch button {
  height: 38px;
  border: 1px solid var(--kw-line-strong);
  border-radius: var(--kw-radius-sm);
  background: var(--kw-surface-muted);
  color: var(--kw-text-muted);
}

.mode-switch button.active {
  border-color: var(--kw-primary);
  background: var(--kw-surface);
  color: var(--kw-text);
  font-weight: 600;
}

.form-grid {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.form-grid *,
.form-grid *::before,
.form-grid *::after {
  box-sizing: border-box;
}

.field {
  display: block;
}

.field input {
  width: 100%;
  height: 42px;
  border: 1px solid var(--kw-line-strong);
  border-radius: 999px;
  padding: 0 12px;
}

.checkbox.remember {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--kw-text-muted);
  font-size: 13px;
  margin-top: 2px;
  padding-left: 2px;
}

.actions {
  display: grid;
  gap: 8px;
  margin-top: 4px;
}

.actions button {
  height: 42px;
  border: 1px solid var(--kw-line-strong);
  border-radius: 999px;
  padding: 0 12px;
  background: var(--kw-surface);
  cursor: pointer;
  font-size: 16px;
}

.actions .block {
  width: 100%;
}

.actions .primary {
  background: var(--kw-primary);
  border-color: var(--kw-primary);
  color: var(--kw-primary-contrast);
}

.actions .ghost {
  background: #f8fafc;
}

.actions button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.error {
  margin: 10px 0 0;
  color: var(--kw-danger-text);
  font-size: 13px;
  text-align: center;
}

.success {
  margin: 10px 0 0;
  color: var(--kw-success-text);
  font-size: 13px;
  text-align: center;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: grid;
  place-items: center;
  padding: 16px;
}

.modal-panel {
  width: min(420px, 100%);
  background: var(--kw-surface);
  border: 1px solid var(--kw-line);
  border-radius: var(--kw-radius-md);
  padding: 20px 18px 16px;
  position: relative;
  box-shadow: var(--kw-shadow-card);
}

.modal-panel h2 {
  margin: 0 0 10px;
  font-size: 22px;
}

.modal-panel p {
  margin: 0;
  color: var(--kw-text-muted);
  line-height: 1.45;
}

.modal-close {
  position: absolute;
  right: 10px;
  top: 8px;
  width: 30px;
  height: 30px;
  border: 1px solid var(--kw-line-strong);
  border-radius: 50%;
  background: var(--kw-surface-muted);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}
</style>
