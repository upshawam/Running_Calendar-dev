import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: "/Running_Calendar-dev/",
  server: {
    port: 5173,
    strictPort: true, // Always use port 5173, error if busy
  },
  build: {
    outDir: 'docs',
    emptyOutDir: false
  }
})
