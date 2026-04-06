import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/osrm': {
        target: 'https://router.project-osrm.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/osrm/, '')
      }
    }
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js']
  }
})
