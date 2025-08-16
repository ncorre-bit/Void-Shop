// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5175,
    allowedHosts: ['.trycloudflare.com'],
    hmr: false,
    proxy: {
      // все запросы /api/* будут проксироваться на локальный бэкенд
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api') // оставляем /api
      }
    }
  }
})
