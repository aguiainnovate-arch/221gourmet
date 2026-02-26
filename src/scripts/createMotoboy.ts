/**
 * Script para criar um usuário motoboy e gerar arquivo .md com credenciais.
 *
 * Uso:
 *   npx tsx src/scripts/createMotoboy.ts --email=motoboy@exemplo.com [--password=Senha123] [--nome="João Silva"]
 *   npm run create:motoboy -- --email=motoboy@exemplo.com --nome="João"
 *
 * Se --password não for informado, uma senha aleatória é gerada (exibida no console e salva no .md).
 */

import bcrypt from 'bcryptjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createMotoboy as createMotoboyUser, getAppUserByEmail } from '../services/userService';

const DEFAULT_PASSWORD_LENGTH = 10;

function randomPassword(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < length; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

function parseArgs(): { email: string; password: string | null; nome: string | null } {
  const args = process.argv.slice(2);
  let email = '';
  let password: string | null = null;
  let nome: string | null = null;
  for (const arg of args) {
    if (arg.startsWith('--email=')) email = arg.slice(8).trim();
    else if (arg.startsWith('--password=')) password = arg.slice(11).trim();
    else if (arg.startsWith('--nome=')) nome = arg.slice(7).trim();
  }
  return { email, password, nome };
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .slice(0, 50) || 'motoboy';
}

async function main() {
  const { email, password: rawPassword, nome } = parseArgs();
  if (!email) {
    console.error('Uso: npx tsx src/scripts/createMotoboy.ts --email=motoboy@exemplo.com [--password=Senha123] [--nome="João Silva"]');
    process.exit(1);
  }

  const existing = await getAppUserByEmail(email);
  if (existing && existing.role === 'MOTOBOY') {
    console.error(`Já existe um usuário motoboy com o email: ${email}`);
    process.exit(1);
  }

  const password = rawPassword || randomPassword(DEFAULT_PASSWORD_LENGTH);
  const passwordHash = await bcrypt.hash(password, 10);

  const displayName = nome || email.split('@')[0];
  const user = await createMotoboyUser(
    { email, password: '', displayName },
    passwordHash
  );

  const dir = join(process.cwd(), 'docs', 'motoboys');
  await mkdir(dir, { recursive: true });
  const baseName = sanitizeFilename(displayName) || user.id;
  const filename = `motoboy-${baseName}.md`;
  const filepath = join(dir, filename);

  const loginUrl = process.env.VITE_APP_URL
    ? `${process.env.VITE_APP_URL.replace(/\/$/, '')}/delivery/auth`
    : 'URL do app + /delivery/auth (ex.: https://seu-app.netlify.app/delivery/auth)';

  const content = `# Credenciais – Motoboy

| Campo | Valor |
|-------|--------|
| **Nome** | ${displayName} |
| **Email / Login** | ${user.email} |
| **Senha** | ${password} |
| **Role** | MOTOBOY |
| **Data de criação** | ${new Date().toISOString()} |
| **URL de login** | ${loginUrl} |

## Instruções

1. Acesse a página de login do delivery: **/delivery/auth**
2. Informe o **email** acima e clique em Entrar; em seguida digite a **senha**.
3. Após o login você será redirecionado para o **Painel do Motoboy** (/motoboy), onde verá as chamadas pendentes e poderá **Aceitar** ou **Recusar**.
`;

  await writeFile(filepath, content, 'utf-8');
  console.log('Motoboy criado com sucesso.');
  console.log('ID:', user.id);
  console.log('Email:', user.email);
  console.log('Arquivo de credenciais:', filepath);
  if (!rawPassword) {
    console.log('Senha gerada (guardada no .md):', password);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
