import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuración de Vite: React + servidor visible desde el celular en la misma red wifi
export default defineConfig({
  plugins: [react()],
  server: { host: true },
})
