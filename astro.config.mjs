import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://tilebridge.ru',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  integrations: [sitemap()],
  vite: {
    ssr: {
      noExternal: ['@fontsource/manrope', '@fontsource/inter'],
    },
  },
});
