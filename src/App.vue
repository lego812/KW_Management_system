<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, hasFirebaseConfig } from './plugins/firebase'

const isLoggedIn = ref(false)
let unsubscribe

onMounted(() => {
  if (!hasFirebaseConfig || !auth) return
  unsubscribe = onAuthStateChanged(auth, (user) => {
    isLoggedIn.value = !!user
  })
})

onBeforeUnmount(() => {
  unsubscribe?.()
})
</script>

<template>
  <div v-if="isLoggedIn" class="login-badge">로그인 완료</div>
  <router-view />
</template>

<style scoped>
.login-badge {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 1000;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid #86efac;
  background: #dcfce7;
  color: #166534;
  font-size: 13px;
  font-weight: 600;
}
</style>
