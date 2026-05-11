import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const MAX_BODY = 16_384
const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true'

/** Espelha logs do browser no terminal durante `npm run dev`. */
function devClientLogPlugin(): Plugin {
  return {
    name: 'dev-client-log',
    configureServer(server) {
      server.middlewares.use(
        '/__dev-client-log',
        (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          if (req.method !== 'POST') {
            next()
            return
          }
          let size = 0
          const chunks: Buffer[] = []
          req.on('data', (chunk: Buffer) => {
            size += chunk.length
            if (size <= MAX_BODY) chunks.push(chunk)
          })
          req.on('end', () => {
            try {
              const body = Buffer.concat(chunks).toString('utf8')
              const j = JSON.parse(body || '{}') as {
                level?: string
                message?: string
              }
              const prefix = '[browser→terminal]'
              const msg = typeof j.message === 'string' ? j.message : ''
              if (j.level === 'error') console.error(prefix, msg)
              else if (j.level === 'warn') console.warn(prefix, msg)
              else console.log(prefix, msg)
            } catch {
              console.error('[dev-client-log] corpo inválido')
            }
            res.statusCode = 204
            res.end()
          })
        }
      )
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), devClientLogPlugin()],
  base: isCapacitorBuild ? './' : '/',
  server: {
    host: true, // escuta em 0.0.0.0 — acessível na rede (ex.: celular/outro PC na mesma Wi‑Fi)
    port: 5173,
    /**
     * OpenAI não envia CORS para o browser em chamadas diretas com API key.
     * O front chama /__proxy-openai/v1/... (mesma origem) e o Vite repassa para api.openai.com.
     * Anthropic não precisa mais de proxy — a chave fica no servidor (Firebase Functions).
     */
    proxy: {
      '/__proxy-openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/__proxy-openai/, ''),
      },
    },
  },
  preview: {
    host: true, // preview do build também acessível na rede
    port: 4173,
  },
})
