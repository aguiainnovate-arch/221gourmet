#!/usr/bin/env node
/**
 * Cross-platform Gradle runner for android/ (gradlew vs gradlew.bat).
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const androidDir = path.join(root, 'android')
const isWin = process.platform === 'win32'
const gradlew = path.join(androidDir, isWin ? 'gradlew.bat' : 'gradlew')
const args = process.argv.slice(2)

if (args.length === 0) {
  console.error('Uso: node scripts/run-gradle.mjs <task> [...args]')
  process.exit(1)
}

const result = spawnSync(gradlew, args, {
  cwd: androidDir,
  stdio: 'inherit',
  shell: isWin,
  env: process.env,
})

process.exit(result.status ?? 1)
