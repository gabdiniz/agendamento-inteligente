// ─── dev-reset-patient-password.ts ────────────────────────────────────────────
//
// Utilitário de DEV — redefine a senha de um paciente para um valor conhecido.
// Busca por EMAIL ou PHONE (use o que estiver disponível).
//
// Uso:
//   SLUG=clinica-demo EMAIL=paciente@email.com NEW_PASSWORD=Senha@123 \
//     tsx src/dev-reset-patient-password.ts
//
//   SLUG=clinica-demo PHONE=11999990001 NEW_PASSWORD=Senha@123 \
//     tsx src/dev-reset-patient-password.ts
//
// ⚠️  Nunca commitar senhas aqui. Este script é só para desenvolvimento local.
// ─────────────────────────────────────────────────────────────────────────────

import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const slug     = process.env['SLUG']         ?? ''
const email    = process.env['EMAIL']        ?? ''
const phone    = process.env['PHONE']        ?? ''
const password = process.env['NEW_PASSWORD'] ?? 'Dev@1234'

if (!slug || (!email && !phone)) {
  console.error('❌  Uso: SLUG=<slug> EMAIL=<email>|PHONE=<fone> [NEW_PASSWORD=<senha>] tsx src/dev-reset-patient-password.ts')
  process.exit(1)
}

const baseUrl = process.env['DATABASE_URL']
if (!baseUrl) {
  console.error('❌  DATABASE_URL não definida')
  process.exit(1)
}

// Aponta para o schema do tenant
const tenantUrl = new URL(baseUrl)
tenantUrl.searchParams.set('schema', `tenant_${slug.replace(/-/g, '_')}`)

const prisma = new PrismaClient({
  datasources: { db: { url: tenantUrl.toString() } },
})

async function main() {
  const schemaName = `tenant_${slug.replace(/-/g, '_')}`

  // Lista todos os pacientes para debug caso não encontre
  const total = await prisma.patient.count()
  console.log(`\n📋  Total de pacientes no schema ${schemaName}: ${total}`)

  // Busca por e-mail ou telefone
  const where = email ? { email } : { phone }
  const label = email ? `e-mail "${email}"` : `telefone "${phone}"`

  const patient = await prisma.patient.findFirst({
    where,
    select: { id: true, name: true, email: true, phone: true },
  })

  if (!patient) {
    // Mostra todos os pacientes para facilitar o diagnóstico
    const all = await prisma.patient.findMany({
      select: { id: true, name: true, email: true, phone: true },
      take: 20,
    })
    console.error(`\n❌  Paciente com ${label} não encontrado.`)
    console.log('\n📋  Pacientes existentes:')
    if (all.length === 0) {
      console.log('    (nenhum)')
    } else {
      all.forEach((p) => console.log(`    • ${p.name} | tel: ${p.phone} | email: ${p.email ?? '(sem email)'}`))
    }
    process.exit(1)
  }

  // Se o paciente não tem e-mail, atualiza também
  if (email && !patient.email) {
    await prisma.patient.update({
      where: { id: patient.id },
      data:  { email },
    })
    console.log(`   ✓ E-mail definido: ${email}`)
  }

  const hash = await bcrypt.hash(password, 10)

  await prisma.patient.update({
    where: { id: patient.id },
    data:  { passwordHash: hash },
  })

  console.log(`\n✅  Senha atualizada com sucesso!`)
  console.log(`   Paciente : ${patient.name}`)
  console.log(`   Telefone : ${patient.phone}`)
  console.log(`   E-mail   : ${patient.email ?? email ?? '(sem email)'}`)
  console.log(`   Nova senha: ${password}`)
  console.log(`   Portal   : http://localhost:5173/${slug}/minha-conta/login\n`)
}

main()
  .catch((err) => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
