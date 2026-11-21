import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

const ONE_MONTH = 30 * 24 * 60 * 60

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'dept-quiz — jeu de géographie',
        short_name: 'dept-quiz',
        description: 'Retrouve départements, États et provinces sur la carte.',
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        theme_color: '#4a78ec',
        background_color: '#343434',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Jeux, données et images en précache : jouable hors ligne
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,ico,webp,json,geojson}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Tuiles et polices Stadia : mises en cache à mesure qu'elles sont vues
            urlPattern: /^https:\/\/tiles\.stadiamaps\.com\/tiles\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'stadia-tiles',
              expiration: { maxEntries: 1000, maxAgeSeconds: ONE_MONTH },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: /^https:\/\/tiles\.stadiamaps\.com\/fonts\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'stadia-fonts',
              expiration: { maxEntries: 100, maxAgeSeconds: ONE_MONTH },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    // maplibre (~800 Ko) est isolé dans le chunk du jeu, chargé à la demande
    chunkSizeWarningLimit: 1100,
  },
  server: {
    // API des scores servie par `wrangler pages dev`
    proxy: {
      '/api': 'http://localhost:8788',
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
})
