import { onBuild, onPostBuild } from '@edgeone/nuxt-pages';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const buildOptions = {
  cwd: process.cwd(),
  env: process.env,
  meta: {},
  functions: {},
  constants: {
    PUBLISH_DIR: '.edgeone'
  }
};

async function main() {
  console.log('Starting EdgeOne Nuxt Build...');
  const tempConfigPath = join(process.cwd(), 'edgeone.build.config.ts');
  const nuxtConfigPath = join(process.cwd(), 'nuxt.config.ts');

  try {
    const nuxtConfigContent = readFileSync(nuxtConfigPath, 'utf8');
    const layerMatch = nuxtConfigContent.match(/if9-supabase-auth#([^\]'"\s,]+)/);
    const layerVersion = layerMatch?.[1] || 'unknown';
    console.log(`-> Layer: if9-supabase-auth#${layerVersion}`);
    console.log('-> GIGET_FORCE=1');

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
`;
    writeFileSync(tempConfigPath, configContent);

    console.log('-> Running nuxt build...');
    execSync('npx nuxt build --extends ./edgeone.build.config.ts', { stdio: 'inherit', env: { ...process.env, GIGET_FORCE: '1' } });

    console.log('-> Running onBuild...');
    await onBuild(buildOptions);

    console.log('-> Running onPostBuild...');
    await onPostBuild(buildOptions);

    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  } finally {
    try {
      unlinkSync(tempConfigPath);
    } catch (e) {
    }
  }
}

main();
