import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/barb': {
        target: 'https://barb-api.co.uk',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/barb/, '/api/v1'),
        secure: true,
      },
    },
  },
})
