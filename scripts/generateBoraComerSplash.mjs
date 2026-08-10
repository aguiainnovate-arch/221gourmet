#!/usr/bin/env node
/**
 * Gera splash + ícones Android/iOS a partir de dist/BoraComerlogo.png (fonte única).
 * Versão Node/cross-platform (substitui generateBoraComerSplash.py no Windows).
 */
import { cpSync, existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LOGO_PATH = path.join(ROOT, 'dist', 'BoraComerlogo.png')
const RES_DIR = path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
const RESOURCES_DIR = path.join(ROOT, 'resources')
const IOS_APPICON_DIR = path.join(
  ROOT,
  'ios',
  'App',
  'App',
  'Assets.xcassets',
  'AppIcon.appiconset',
)
const SPLASH_BG = { r: 255, g: 248, b: 242, alpha: 1 }
const SPLASH_BG_HEX = '#FFF8F2'
/** Fundo claro do ícone na home / TestFlight / App Store (sem preto). */
const IOS_ICON_BG = { r: 255, g: 248, b: 242 }

/**
 * Remove fundo preto da arte e compõe em canvas claro (ícone da home).
 */
async function composeAppIconOnLightBg(logoBuffer, size = 1024) {
  const { data, info } = await sharp(logoBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    // Preto / quase-preto do fundo → transparente
    if (r < 45 && g < 45 && b < 45) {
      data[i + 3] = 0
    }
  }

  const cutout = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .resize(Math.floor(size * 0.9), Math.floor(size * 0.9), {
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
      background: IOS_ICON_BG,
    },
  })
    .composite([{ input: cutout, gravity: 'centre' }])
    .png()
    .toBuffer()
}

const SPLASH_SIZES = {
  'drawable-port-ldpi/splash.png': [240, 320],
  'drawable-port-mdpi/splash.png': [320, 480],
  'drawable-port-hdpi/splash.png': [480, 800],
  'drawable-port-xhdpi/splash.png': [720, 1280],
  'drawable-port-xxhdpi/splash.png': [960, 1600],
  'drawable-port-xxxhdpi/splash.png': [1280, 1920],
  'drawable-land-ldpi/splash.png': [320, 240],
  'drawable-land-mdpi/splash.png': [480, 320],
  'drawable-land-hdpi/splash.png': [800, 480],
  'drawable-land-xhdpi/splash.png': [1280, 720],
  'drawable-land-xxhdpi/splash.png': [1600, 960],
  'drawable-land-xxxhdpi/splash.png': [1920, 1280],
  'drawable/splash.png': [320, 480],
}

function toNightPath(relPath) {
  const folder = relPath.split('/')[0]
  if (folder.startsWith('drawable-port-')) {
    return `drawable-port-night-${folder.slice('drawable-port-'.length)}/splash.png`
  }
  if (folder.startsWith('drawable-land-')) {
    return `drawable-land-night-${folder.slice('drawable-land-'.length)}/splash.png`
  }
  return null
}

async function composeSplash(logoBuffer, width, height) {
  const isPortrait = height >= width
  const maxW = Math.floor(width * (isPortrait ? 0.88 : 0.55))
  const maxH = Math.floor(height * (isPortrait ? 0.38 : 0.72))
  const yRatio = isPortrait ? 0.1 : 0.12

  const fitted = await sharp(logoBuffer)
    .resize(maxW, maxH, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer({ resolveWithObject: true })

  const x = Math.floor((width - fitted.info.width) / 2)
  const y = Math.floor(height * yRatio)

  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: SPLASH_BG,
    },
  })
    .composite([{ input: fitted.data, left: x, top: y }])
    .png()
    .toBuffer()
}

async function syncResourceFiles() {
  if (!existsSync(LOGO_PATH)) {
    throw new Error(`Logo não encontrada: ${LOGO_PATH}`)
  }
  mkdirSync(RESOURCES_DIR, { recursive: true })
  const logoBuffer = await sharp(LOGO_PATH).png().toBuffer()
  const lightIcon = await composeAppIconOnLightBg(logoBuffer, 1024)
  writeFileSync(path.join(RESOURCES_DIR, 'icon.png'), lightIcon)
  writeFileSync(path.join(RESOURCES_DIR, 'icon-source.png'), lightIcon)
  // Splash continua com a arte original (composeSplash já usa fundo creme)
  cpSync(LOGO_PATH, path.join(RESOURCES_DIR, 'splash.png'))
  const oldLogo = path.join(RESOURCES_DIR, 'logo.jpeg')
  if (existsSync(oldLogo)) unlinkSync(oldLogo)
}

function generateLauncherIcons() {
  const result = spawnSync(
    'npx',
    [
      '@capacitor/assets',
      'generate',
      '--assetPath',
      'resources',
      '--iconBackgroundColor',
      SPLASH_BG_HEX,
      '--iconBackgroundColorDark',
      SPLASH_BG_HEX,
      '--splashBackgroundColor',
      SPLASH_BG_HEX,
      '--splashBackgroundColorDark',
      SPLASH_BG_HEX,
      '--android',
      '--ios',
    ],
    { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' },
  )
  if (result.status !== 0) {
    throw new Error(`@capacitor/assets falhou com código ${result.status}`)
  }
}

/**
 * Garante App Icon iOS 1024x1024 opaco com fundo claro (TestFlight / App Store).
 */
async function generateIosAppIcon(logoBuffer) {
  mkdirSync(IOS_APPICON_DIR, { recursive: true })
  const outPath = path.join(IOS_APPICON_DIR, 'AppIcon-512@2x.png')
  const png = await composeAppIconOnLightBg(logoBuffer, 1024)
  writeFileSync(outPath, png)

  writeFileSync(
    path.join(IOS_APPICON_DIR, 'Contents.json'),
    `${JSON.stringify(
      {
        images: [
          {
            filename: 'AppIcon-512@2x.png',
            idiom: 'universal',
            platform: 'ios',
            size: '1024x1024',
          },
        ],
        info: { author: 'xcode', version: 1 },
      },
      null,
      2,
    )}\n`,
    'utf8',
  )
}

async function generateSplashImages(logoBuffer) {
  for (const [relPath, [width, height]] of Object.entries(SPLASH_SIZES)) {
    const out = path.join(RES_DIR, ...relPath.split('/'))
    mkdirSync(path.dirname(out), { recursive: true })
    const png = await composeSplash(logoBuffer, width, height)
    writeFileSync(out, png)

    const nightRel = toNightPath(relPath)
    if (nightRel) {
      const nightOut = path.join(RES_DIR, ...nightRel.split('/'))
      mkdirSync(path.dirname(nightOut), { recursive: true })
      writeFileSync(nightOut, png)
    }
  }

  const nightDrawable = path.join(RES_DIR, 'drawable-night', 'splash.png')
  mkdirSync(path.dirname(nightDrawable), { recursive: true })
  writeFileSync(nightDrawable, await composeSplash(logoBuffer, 320, 480))
}

function cleanupStaleAssets() {
  const stale = path.join(RES_DIR, 'drawable-nodpi', 'splash_icon.png')
  if (existsSync(stale)) unlinkSync(stale)

  const launcherBg = path.join(
    ROOT,
    'android/app/src/main/res/values/ic_launcher_background.xml',
  )
  writeFileSync(
    launcherBg,
    `<?xml version="1.0" encoding="utf-8"?>\n` +
      `<resources>\n` +
      `    <color name="ic_launcher_background">${SPLASH_BG_HEX}</color>\n` +
      `</resources>\n`,
    'utf8',
  )
}

async function main() {
  if (!existsSync(LOGO_PATH)) {
    console.warn(
      `[cap:assets] Logo ausente (${LOGO_PATH}). Pulando regeneração de splash/ícone.`,
    )
    return
  }
  await syncResourceFiles()
  generateLauncherIcons()
  const logoBuffer = await sharp(LOGO_PATH).png().toBuffer()
  await generateSplashImages(logoBuffer)
  await generateIosAppIcon(logoBuffer)
  cleanupStaleAssets()
  console.log(
    'Branding atualizado: ícone fundo claro + splash (Android/iOS)',
  )
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
