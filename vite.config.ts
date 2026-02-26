import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // necessário para Capacitor (file://) carregar assets corretamente
  server: {
    host: true, // escuta em 0.0.0.0 — acessível na rede (ex.: celular/outro PC na mesma Wi‑Fi)
    port: 5173,
  },
  preview: {
    host: true, // preview do build também acessível na rede
    port: 4173,
  },
})
