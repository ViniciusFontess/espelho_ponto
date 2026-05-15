import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../web/static',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/upload': 'http://localhost:8000',
      '/results': 'http://localhost:8000',
    },
  },
})
