#!/usr/bin/env node
/**
 * Gera favicon e apple-touch-icon da Bora Comer com fundo branco.
 */
import { existsSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LOGO_PATH = path.join(ROOT, 'public', 'BoraComerlogo.png')
const WHITE = { r: 255, g: 255, b: 255 }

async function composeOnWhite(logoBuffer, size) {
  const { data, info } = await sharp(logoBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (r < 45 && g < 45 && b < 45) {
      data[i + 3] = 0
    }
  }

  const cutout = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .resize(Math.floor(size * 0.86), Math.floor(size * 0.86), {
      fit: 'inside',
      withoutEnlargement: false,
    })
    .png()
    .toBuffer()

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: WHITE,
    },
  })
    .composite([{ input: cutout, gravity: 'centre' }])
    .png()
    .toBuffer()
}

async function main() {
  if (!existsSync(LOGO_PATH)) {
    throw new Error(`Logo não encontrada: ${LOGO_PATH}`)
  }
  const logoBuffer = await sharp(LOGO_PATH).png().toBuffer()
  const favicon = await composeOnWhite(logoBuffer, 64)
  const apple = await composeOnWhite(logoBuffer, 180)
  const pwa192 = await composeOnWhite(logoBuffer, 192)
  const pwa512 = await composeOnWhite(logoBuffer, 512)

  writeFileSync(path.join(ROOT, 'public', 'favicon.png'), favicon)
  writeFileSync(path.join(ROOT, 'public', 'apple-touch-icon.png'), apple)
  writeFileSync(path.join(ROOT, 'public', 'bora-comer-icon-192.png'), pwa192)
  writeFileSync(path.join(ROOT, 'public', 'bora-comer-icon-512.png'), pwa512)
  console.log('Favicon Bora Comer gerado com fundo branco.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
