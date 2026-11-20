import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    // API des scores servie par `wrangler pages dev` (phase 2)
    proxy: {
      '/api': 'http://localhost:8788'
    }
  }
})
