import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,        // Port désiré
    strictPort: true   // Empêche Vite de passer à un autre port si 3000 est occupé
  }
})