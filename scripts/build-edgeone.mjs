import { onBuild, onPostBuild } from '@edgeone/nuxt-pages'
import { execSync } from 'child_process'
import { readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'

const buildOptions = {
  cwd: process.cwd(),
  env: process.env,
  meta: {},
  functions: {},
  constants: {
    PUBLISH_DIR: '.edgeone',
  },
}

/**
 * 检测项目是否使用了 if9-supabase-auth layer
 * @param {string} nuxtConfigContent - nuxt.config.ts 文件内容
 * @returns {{ hasLayer: boolean, version: string | null }}
 */
function detectLayer(nuxtConfigContent) {
  const layerMatch = nuxtConfigContent.match(/if9-supabase-auth#([^\]'"\\s,]+)/)
  if (layerMatch) {
    return { hasLayer: true, version: layerMatch[1] }
  }
  return { hasLayer: false, version: null }
}

async function main() {
  console.log('Starting EdgeOne Nuxt Build...')
  const tempConfigPath = join(process.cwd(), 'edgeone.build.config.ts')
  const nuxtConfigPath = join(process.cwd(), 'nuxt.config.ts')

  try {
    const nuxtConfigContent = readFileSync(nuxtConfigPath, 'utf8')
    const { hasLayer, version } = detectLayer(nuxtConfigContent)

    // 构建环境变量
    const buildEnv = { ...process.env }

    if (hasLayer) {
      console.log(`-> Layer: if9-supabase-auth#${version}`)
      console.log('-> GIGET_FORCE=1 (Layer detected, forcing cache refresh)')
      buildEnv.GIGET_FORCE = '1'
    }
    else {
      console.log('-> No Layer detected, using standard build')
    }

    console.log('-> Creating temporary EdgeOne config...')
    const configContent = `
export default defineNuxtConfig({
  nitro: {
    output: {
      dir: '.edgeone',
      publicDir: '.edgeone/assets',
      serverDir: '.edgeone/server-handler'
    }
  }
})
`
    writeFileSync(tempConfigPath, configContent)

    console.log('-> Running nuxt build...')
    execSync('npx nuxt build --extends ./edgeone.build.config.ts', {
      stdio: 'inherit',
      env: buildEnv,
    })

    console.log('-> Running onBuild...')
    await onBuild(buildOptions)

    console.log('-> Running onPostBuild...')
    await onPostBuild(buildOptions)

    console.log('Build completed successfully!')
  }
  catch (error) {
    console.error('Build failed:', error)
    process.exit(1)
  }
  finally {
    try {
      unlinkSync(tempConfigPath)
    }
    catch {
      // Ignore cleanup errors
    }
  }
}

main()
