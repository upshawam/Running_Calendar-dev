import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: "/Running_Calendar-dev/",
  server: {
    port: 5173,
    strictPort: false, // Will try next port if 5173 is busy
  },
  build: {
    outDir: 'docs',
    emptyOutDir: false
  }
})
