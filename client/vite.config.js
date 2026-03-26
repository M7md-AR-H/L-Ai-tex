import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // Allow Vite to serve files from one level up (the root node_modules)
      allow: ['..']
    }
  }
})
