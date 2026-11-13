import { createApp, defineComponent, h, markRaw } from 'vue'
import { createPinia } from 'pinia'
import { toast } from 'vue-sonner'
import App from './App.vue'
import { handleUnauthorized } from './router/guard'
import { createAppRouter } from './router'
import { setErrorNotifier, setUnauthorizedHandler } from './utils/request'
import { recordError } from './utils/error-history'
import { initThemeMode } from './utils/theme'
import './styles/globals.css'
import 'vue-sonner/style.css'

initThemeMode()

const router = createAppRouter()

setErrorNotifier((error, path) => {
  if (error.message) {
    recordError(error.message, path)
    const message = error.message
    toast.error(
      markRaw(
        defineComponent({
          setup: () => () =>
            h(
              'span',
              {
                class:
                  'line-clamp-2 break-all whitespace-pre-wrap group-hover/toast:line-clamp-none group-hover/toast:max-h-64 group-hover/toast:overflow-y-auto group-focus-within/toast:line-clamp-none group-focus-within/toast:max-h-64 group-focus-within/toast:overflow-y-auto',
              },
              message,
            ),
        }),
      ),
      { class: 'group/toast hover:!h-auto focus-within:!h-auto' },
    )
  }
})
setUnauthorizedHandler(() => {
  handleUnauthorized(router)
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
