import { createPinia } from 'pinia'
import Particles from '@tsparticles/vue3'
import { loadSlim } from '@tsparticles/slim'
import router from '@/router'
import { setupDirectives } from '@/directives'
import App from '@/App.vue'
import '@/styles/index.scss'

const app = createApp(App)

app.use(createPinia())
app.use(router)
setupDirectives(app)
app.use(Particles, {
  init: async (engine:any) => {
    await loadSlim(engine)
  },
})

app.mount('#app')
