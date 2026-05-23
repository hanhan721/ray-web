export {}

declare module '@tsparticles/vue3' {
  import type { DefineComponent } from 'vue'
  import type { Engine } from '@tsparticles/engine'

  export interface ParticlesProps {
    id?: string
    options?: object
    url?: string
  }

  const Particles: DefineComponent<ParticlesProps>
  export default Particles

  export function VueParticles(
    app: unknown,
    options: {
      init: (engine: Engine) => Promise<void>
    }
  ): void
}

declare module 'vue' {
  export interface GlobalComponents {
    VueParticles: typeof import('@tsparticles/vue3').default
  }
}
