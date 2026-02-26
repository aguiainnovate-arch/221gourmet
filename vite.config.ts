import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // necessário para Capacitor (file://) carregar assets corretamente
  server: {
    host: true, // escuta em 0.0.0.0 — acessível na rede (ex.: celular/outro PC na mesma Wi‑Fi)
    port: 5173,
    // Proxies em dev: evitam CORS ao chamar APIs direto do navegador
    proxy: {
      '/api-openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-openai/, ''),
      },
      '/api-anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-anthropic/, ''),
      },
    },
  },
  preview: {
    host: true, // preview do build também acessível na rede
    port: 4173,
  },
})
