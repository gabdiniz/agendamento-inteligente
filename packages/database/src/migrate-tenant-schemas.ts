// ─── migrate-tenant-schemas.ts ────────────────────────────────────────────────
//
// Aplica o tenant-schema.prisma mais recente em TODOS os tenants existentes.
// Idempotente: só adiciona tabelas/colunas novas, nunca apaga dados.
//
// Uso:
//   npx tsx src/migrate-tenant-schemas.ts
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from './prisma-client.js'
import { createTenantSchema } from './create-tenant-schema.js'

async function main() {
  console.log('🔄 Migrando schemas de tenant...\n')

  const tenants = await prisma.tenant.findMany({
    select: { id: true, slug: true, name: true },
    orderBy: { createdAt: 'asc' },
  })

  if (tenants.length === 0) {
    console.log('Nenhum tenant encontrado.')
    return
  }

  console.log(`Encontrados ${tenants.length} tenant(s).\n`)

  let ok = 0
  let fail = 0

  for (const tenant of tenants) {
    process.stdout.write(`  → ${tenant.name} (${tenant.slug})... `)
    try {
      await createTenantSchema(tenant.slug)
      console.log('✓')
      ok++
    } catch (err) {
      console.log('✗ ERRO')
      console.error(`    ${String(err)}\n`)
      fail++
    }
  }

  console.log(`\n✅ Concluído: ${ok} OK, ${fail} erro(s).`)
}

main()
  .catch((err) => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
