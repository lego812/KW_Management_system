import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './routes'
import './assets/theme.css'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

const authStore = useAuthStore(pinia)
authStore.init()

app.use(router).mount('#app')
