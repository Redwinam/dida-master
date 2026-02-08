import { onBuild, onPostBuild } from '@edgeone/nuxt-pages'
import { execSync } from 'child_process'

const buildOptions = {
  cwd: process.cwd(),
  env: process.env,
  meta: {},
  functions: {},
  constants: {
    PUBLISH_DIR: '.edgeone',
  },
}

async function main() {
  console.log('Starting EdgeOne Nuxt Build...')

  try {
    console.log('-> Running nuxt build...')
    execSync('npx nuxt build', {
      stdio: 'inherit',
      env: { ...process.env, EDGEONE_BUILD: '1' },
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
}

main()
