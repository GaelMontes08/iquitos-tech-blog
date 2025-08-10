// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import path from 'path';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  redirects: {
    '/home': '/',
    '/home/': '/',
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve('./src'),
        '@components': path.resolve('./src/components'),
        '@layouts': path.resolve('./src/layouts'),
        '@pages': path.resolve('./src/pages'),
        
      }
    }
  }
});