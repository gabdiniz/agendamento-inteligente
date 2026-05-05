import { execSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { prisma } from './prisma-client.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
// tenant-schema.prisma contém APENAS os modelos do tenant (sem Tenant, SuperAdminUser, Plan, etc.)
// Usar schema.prisma aqui criaria todas as tabelas do public schema em cada tenant — bug crítico.
const PRISMA_SCHEMA = resolve(__dirname, '..', 'prisma', 'tenant-schema.prisma')

// ─── createTenantSchema ───────────────────────────────────────────────────
//
// Cria um schema PostgreSQL para um novo tenant e aplica todas as
// tabelas do schema tenant via `prisma db push`.
//
// Usado:
//   - No seed (desenvolvimento)
//   - Ao criar um novo tenant via Super Admin (produção)
//
// É idempotente: pode ser chamado múltiplas vezes sem erros.
// ─────────────────────────────────────────────────────────────────────────

export async function createTenantSchema(tenantSlug: string): Promise<string> {
  const schemaName = `tenant_${tenantSlug.replace(/-/g, '_')}`

  // 1. Cria o schema no PostgreSQL se não existir
  await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`)

  console.log(`  ✓ Schema PostgreSQL criado: ${schemaName}`)

  // 2. Monta a DATABASE_URL apontando para o schema do tenant
  const baseUrl = process.env['DATABASE_URL']
  if (!baseUrl) throw new Error('DATABASE_URL não definida')

  const tenantUrl = new URL(baseUrl)
  tenantUrl.searchParams.set('schema', schemaName)

  // 3. Aplica as tabelas do schema tenant via prisma db push
  //    --skip-generate: não regera o client (já foi gerado)
  //    --accept-data-loss: permite alterações sem prompt interativo
  const prismaBin =
    process.env['PRISMA_BIN'] ??
    resolve(__dirname, '..', 'node_modules', '.bin', 'prisma')

  try {
    execSync(
      `"${prismaBin}" db push --schema="${PRISMA_SCHEMA}" --skip-generate --accept-data-loss`,
      {
        env: { ...process.env, DATABASE_URL: tenantUrl.toString() },
        stdio: 'pipe', // captura output para não poluir o seed
        cwd: resolve(__dirname, '..'),
        shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
      },
    )
  } catch (err: unknown) {
    const spawnErr = err as { stderr?: Buffer; stdout?: Buffer }
    const stderr = spawnErr.stderr?.toString().trim() ?? ''
    const stdout = spawnErr.stdout?.toString().trim() ?? ''
    throw new Error(
      `prisma db push falhou para schema "${schemaName}":\n${stderr || stdout || String(err)}`,
    )
  }

  console.log(`  ✓ Tabelas criadas no schema: ${schemaName}`)

  return schemaName
}
