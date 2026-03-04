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
    <header class="header">
      <h1>로그인</h1>
      <p>KW 시스템에 로그인하세요.</p>
      <p v-if="currentUserEmail" class="signed-in">현재 사용자: {{ currentUserEmail }}</p>
    </header>

    <form class="card" @submit.prevent="onSubmit">
      <label class="field">
        <span>Email</span>
        <input v-model="form.email" type="email" placeholder="coach@team.com" required />
      </label>

      <label class="field">
        <span>Password</span>
        <input v-model="form.password" type="password" placeholder="비밀번호" required />
      </label>

      <label class="checkbox">
        <input v-model="form.rememberMe" type="checkbox" />
        <span>로그인 상태 유지</span>
      </label>

      <div class="actions">
        <button type="submit" :disabled="loading">{{ loading ? '처리 중...' : '로그인' }}</button>
        <button type="button" :disabled="loading" @click="onGoogleLogin">Google로 로그인</button>
      </div>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </form>
  </main>
</template>

<style scoped>
.page {
  max-width: 460px;
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

.signed-in {
  margin-top: -4px;
  color: #2563eb;
  font-size: 14px;
}

.card {
  display: grid;
  gap: 12px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 16px;
}

.field {
  display: grid;
  gap: 6px;
}

.field span {
  font-size: 14px;
  color: #374151;
}

.field input {
  height: 38px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0 10px;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
}

.actions {
  display: flex;
  gap: 8px;
}

.actions button {
  height: 38px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0 12px;
  background: #ffffff;
  cursor: pointer;
}

.actions button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.error {
  margin: 0;
  color: #b91c1c;
  font-size: 13px;
}
</style>
