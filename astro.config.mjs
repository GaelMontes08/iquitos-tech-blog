// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://iquitos-tech.com',
  output: 'server',
  adapter: vercel({
    webAnalytics: {
      enabled: true
    }
  }),
  redirects: {
    '/home': '/'
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
    },
    build: {
      minify: 'terser',
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor': ['@astrojs/vercel']
          }
        }
      }
    },
    assetsInclude: ['**/*.woff2', '**/*.woff', '**/*.ttf']
  },
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto'
  }
});