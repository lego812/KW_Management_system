<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { signInByEmail, signInByGoogle, watchAuthState } from '../api/auth'

const form = reactive({
  email: '',
  password: '',
  rememberMe: true,
})

const router = useRouter()
const loading = ref(false)
const errorMessage = ref('')
const currentUserEmail = ref('')
let unsubscribe

onMounted(() => {
  unsubscribe = watchAuthState((user) => {
    currentUserEmail.value = user?.email ?? ''
    if (user) {
      router.push('/')
    }
  })
})

onBeforeUnmount(() => {
  unsubscribe?.()
})

async function onSubmit() {
  errorMessage.value = ''
  loading.value = true
  try {
    await signInByEmail(form.email, form.password)
    await router.push('/')
  } catch (error) {
    errorMessage.value = error?.message ?? '로그인에 실패했습니다.'
  } finally {
    loading.value = false
  }
}

async function onGoogleLogin() {
  errorMessage.value = ''
  loading.value = true
  try {
    await signInByGoogle()
    await router.push('/')
  } catch (error) {
    errorMessage.value = error?.message ?? '구글 로그인에 실패했습니다.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="page">
    <section class="panel auth-panel">
      <header class="header-block">
        <p class="eyebrow">Authentication</p>
        <h1>로그인</h1>
        <p class="sub">계정 인증 후 관리자 포털 기능을 사용할 수 있습니다.</p>
        <p v-if="currentUserEmail" class="signed-in">현재 사용자: {{ currentUserEmail }}</p>
      </header>

      <form class="form-grid" @submit.prevent="onSubmit">
        <label class="field">
          <span>이메일</span>
          <input v-model="form.email" type="email" placeholder="coach@team.com" required>
        </label>

        <label class="field">
          <span>비밀번호</span>
          <input v-model="form.password" type="password" placeholder="비밀번호" required>
        </label>

        <label class="checkbox">
          <input v-model="form.rememberMe" type="checkbox">
          <span>로그인 상태 유지</span>
        </label>

        <div class="actions">
          <button type="submit" :disabled="loading" class="primary">
            {{ loading ? '처리 중...' : '로그인' }}
          </button>
          <button type="button" :disabled="loading" @click="onGoogleLogin">Google로 로그인</button>
        </div>

        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      </form>
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

.auth-panel {
  max-width: 520px;
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

.signed-in {
  margin: 8px 0 0;
  color: #2563eb;
  font-size: 13px;
}

.form-grid {
  display: grid;
  gap: 12px;
  margin-top: 14px;
}

.field {
  display: grid;
  gap: 6px;
}

.field span {
  font-size: 13px;
  color: var(--kw-text-muted);
}

.field input {
  height: 40px;
  border: 1px solid var(--kw-line-strong);
  border-radius: var(--kw-radius-sm);
  padding: 0 12px;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--kw-text-muted);
  font-size: 14px;
}

.actions {
  display: flex;
  gap: 8px;
}

.actions button {
  height: 38px;
  border: 1px solid var(--kw-line-strong);
  border-radius: var(--kw-radius-sm);
  padding: 0 12px;
  background: var(--kw-surface);
  cursor: pointer;
}

.actions .primary {
  background: var(--kw-primary);
  border-color: var(--kw-primary);
  color: var(--kw-primary-contrast);
}

.actions button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.error {
  margin: 0;
  color: var(--kw-danger-text);
  font-size: 13px;
}
</style>
