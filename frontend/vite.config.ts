import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 25320,
    strictPort: true,
    host: true, // Allow external access (equivalent to "0.0.0.0")
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:25792',
        changeOrigin: true,
        secure: false,
        // Keep /api prefix - backend expects /api/tasks/...
      },
    },
  },
})
