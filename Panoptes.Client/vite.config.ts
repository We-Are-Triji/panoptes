import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/Subscriptions': {
        target: 'http://localhost:5033',
        changeOrigin: true,
        secure: false,
      },
      '/logs': {
        target: 'http://localhost:5033',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
