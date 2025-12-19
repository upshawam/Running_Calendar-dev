import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: "/Running_Calendar-dev/",
  build: {
    outDir: 'docs',
    emptyOutDir: false
  }
})
