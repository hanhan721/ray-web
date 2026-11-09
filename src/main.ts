import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { toast } from 'vue-sonner'
import App from './App.vue'
import { handleUnauthorized } from './router/guard'
import { createAppRouter } from './router'
import { setErrorNotifier, setUnauthorizedHandler } from './utils/request'
import { initThemeMode } from './utils/theme'
import './styles/globals.css'
import 'vue-sonner/style.css'

initThemeMode()

const router = createAppRouter()

setErrorNotifier((error) => {
  if (error.message) toast.error(error.message)
})
setUnauthorizedHandler(() => {
  handleUnauthorized(router)
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
