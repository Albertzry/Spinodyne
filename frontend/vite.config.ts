import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Public access
    port: 25320,     // Specified Frontend Port
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:25792',
        changeOrigin: true,
      },
      '/static': {
        target: 'http://127.0.0.1:25792',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
