import { defineNuxtPlugin } from '#app'
import { Buffer } from 'buffer'

export default defineNuxtPlugin(() => {
  if (import.meta.client) {
    if (typeof window !== 'undefined') {
      window.global = window
      window.Buffer = Buffer
      if (!window.process) {
        window.process = {
          env: {},
          version: '',
          nextTick: (cb: any) => setTimeout(cb, 0),
        } as any
      }
    }
  }
})
