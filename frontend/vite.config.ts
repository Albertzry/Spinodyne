import path from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const configPath = path.resolve(__dirname, '../config.json')
const projectConfig = JSON.parse(readFileSync(configPath, 'utf-8'))

const backendPort = projectConfig.backend?.port ?? 25306
const frontendPort = projectConfig.frontend?.port ?? 25916
const frontendHost = projectConfig.frontend?.host ?? '0.0.0.0'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: frontendPort,
    strictPort: false,
    host: frontendHost,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${backendPort}`,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  define: {
    'import.meta.env.VITE_APP_PORT': JSON.stringify(frontendPort),
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(''),
  },
})
