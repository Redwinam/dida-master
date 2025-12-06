export default defineNitroPlugin(async (nitroApp) => {
  // Polyfill for Edge environments that might be missing global or Buffer
  if (typeof global === 'undefined') {
    // @ts-ignore
    globalThis.global = globalThis
  }
  
  if (typeof Buffer === 'undefined') {
    try {
        const { Buffer } = await import('buffer')
        // @ts-ignore
        globalThis.Buffer = Buffer
    } catch (e) {
        console.warn('Failed to polyfill Buffer:', e)
    }
  }

  if (typeof process === 'undefined') {
    // @ts-ignore
    globalThis.process = { env: {}, cwd: () => '/' }
  }
})
