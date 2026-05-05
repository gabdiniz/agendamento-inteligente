import { hash } from 'bcryptjs'

import { prisma, createTenantClient } from './index.js'
import { createTenantSchema } from './create-tenant-schema.js'

// ─── Credenciais do ambiente de demonstração ─────────────────────────────
//
// ATENÇÃO: trocar em produção. Estas credenciais são apenas para
// o ambiente de desenvolvimento local.
//
// Super Admin:  admin@myagendix.com   /  Admin@123456
// Gestor Demo:  gestor@clinica-demo.com  /  Gestor@123456
// ─────────────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12
const DEMO_SLUG = 'clinica-demo'
const DEMO_SCHEMA = `tenant_${DEMO_SLUG.replace(/-/g, '_')}`

async function main() {
  console.log('\n🌱 Iniciando seed do MyAgendix...\n')

  // ─── 1. Super Admin ────────────────────────────────────────────────────
  console.log('📌 [1/5] Criando Super Admin...')

  await prisma.superAdminUser.upsert({
    where: { email: 'admin@myagendix.com' },
    update: {},
    create: {
      name: 'Admin MyAgendix',
      email: 'admin@myagendix.com',
      passwordHash: await hash('Admin@123456', BCRYPT_ROUNDS),
      isActive: true,
    },
  })

  console.log('  ✓ admin@myagendix.com criado')

  // ─── 2. Tenant Demo ────────────────────────────────────────────────────
  console.log('\n📌 [2/5] Criando Tenant Demo...')

  const tenant = await prisma.tenant.upsert({
    where: { slug: DEMO_SLUG },
    update: {},
    create: {
      name: 'Clínica Demo',
      slug: DEMO_SLUG,
      email: 'contato@clinicademo.com',
      phone: '+5511999990000',
      address: 'Rua das Acácias, 123 — São Paulo, SP',
      planType: 'BASIC',
      isActive: true,
    },
  })

  console.log(`  ✓ Tenant "${tenant.name}" (slug: ${tenant.slug}) criado`)

  // ─── 3. Schema + Tabelas do Tenant ─────────────────────────────────────
  console.log('\n📌 [3/5] Criando schema e tabelas do tenant...')

  await createTenantSchema(DEMO_SLUG)

  // ─── 4. Dados do Tenant ────────────────────────────────────────────────
  console.log('\n📌 [4/5] Populando dados do tenant...')

  const tenantPrisma = createTenantClient(DEMO_SCHEMA)

  try {
    // ── Usuário Gestor ──────────────────────────────────────────
    const gestor = await tenantPrisma.user.upsert({
      where: { email: 'gestor@clinica-demo.com' },
      update: {},
      create: {
        name: 'Ana Lima',
        email: 'gestor@clinica-demo.com',
        passwordHash: await hash('Gestor@123456', BCRYPT_ROUNDS),
        phone: '+5511999991111',
        isActive: true,
      },
    })

    await tenantPrisma.userRole.upsert({
      where: { userId_role: { userId: gestor.id, role: 'GESTOR' } },
      update: {},
      create: { userId: gestor.id, role: 'GESTOR' },
    })

    console.log(`  ✓ Gestor: ${gestor.email}`)

    // ── Profissional vinculado ao gestor ────────────────────────
    const professional = await tenantPrisma.professional.upsert({
      where: { userId: gestor.id },
      update: {},
      create: {
        userId: gestor.id,
        name: 'Dra. Ana Lima',
        specialty: 'Dermatologia',
        bio: 'Especialista em dermatologia clínica e estética com 10 anos de experiência.',
        color: '#6366f1',
        isActive: true,
      },
    })

    console.log(`  ✓ Profissional: ${professional.name}`)

    // ── Procedimentos ───────────────────────────────────────────
    const proceduresData = [
      {
        name: 'Consulta Dermatológica',
        description: 'Consulta clínica geral de dermatologia.',
        durationMinutes: 30,
        color: '#3b82f6',
      },
      {
        name: 'Limpeza de Pele',
        description: 'Procedimento de limpeza profunda e extração de cravos.',
        durationMinutes: 60,
        color: '#10b981',
      },
      {
        name: 'Aplicação de Botox',
        description: 'Aplicação de toxina botulínica para fins estéticos.',
        durationMinutes: 45,
        color: '#f59e0b',
      },
      {
        name: 'Peeling Químico',
        description: 'Renovação celular com ácidos para tratamento de manchas e acne.',
        durationMinutes: 45,
        color: '#ec4899',
      },
    ]

    const procedures = []
    for (const data of proceduresData) {
      let proc = await tenantPrisma.procedure.findFirst({ where: { name: data.name } })
      if (!proc) {
        proc = await tenantPrisma.procedure.create({ data: { ...data, isActive: true } })
      }
      procedures.push(proc)
      console.log(`  ✓ Procedimento: ${proc.name} (${proc.durationMinutes} min)`)
    }

    // ── Vínculo Profissional ↔ Procedimentos ────────────────────
    for (const proc of procedures) {
      await tenantPrisma.professionalProcedure.upsert({
        where: {
          professionalId_procedureId: {
            professionalId: professional.id,
            procedureId: proc.id,
          },
        },
        update: {},
        create: {
          professionalId: professional.id,
          procedureId: proc.id,
        },
      })
    }

    console.log(`  ✓ Procedimentos vinculados à Dra. Ana Lima`)

    // ── Grade de Horários (Seg–Sex, 09h–18h, slots de 30 min) ───
    const weekdays = [1, 2, 3, 4, 5] // 1=Seg ... 5=Sex

    for (const day of weekdays) {
      await tenantPrisma.workSchedule.upsert({
        where: {
          professionalId_dayOfWeek: {
            professionalId: professional.id,
            dayOfWeek: day,
          },
        },
        update: {},
        create: {
          professionalId: professional.id,
          dayOfWeek: day,
          startTime: new Date('1970-01-01T09:00:00.000Z'),
          endTime: new Date('1970-01-01T18:00:00.000Z'),
          slotIntervalMinutes: 30,
          isActive: true,
        },
      })
    }

    console.log(`  ✓ Grade: Segunda a Sexta, 09h–18h`)

    // ── Pacientes de exemplo ────────────────────────────────────
    const patientsData = [
      {
        name: 'Carlos Mendes',
        phone: '+5511988881111',
        email: 'carlos.mendes@email.com',
        source: 'MANUAL' as const,
      },
      {
        name: 'Fernanda Costa',
        phone: '+5511988882222',
        email: 'fernanda.costa@email.com',
        source: 'PUBLIC_PAGE' as const,
      },
      {
        name: 'Roberto Alves',
        phone: '+5511988883333',
        email: null,
        source: 'MANUAL' as const,
      },
    ]

    for (const data of patientsData) {
      await tenantPrisma.patient.upsert({
        where: { phone: data.phone },
        update: {},
        create: {
          name: data.name,
          phone: data.phone,
          email: data.email ?? undefined,
          source: data.source,
          isActive: true,
        },
      })
      console.log(`  ✓ Paciente: ${data.name}`)
    }
  } finally {
    await tenantPrisma.$disconnect()
  }

  // ─── 5. Resumo ─────────────────────────────────────────────────────────
  console.log('\n📌 [5/5] Seed concluído!\n')
  console.log('─────────────────────────────────────────────────────')
  console.log('  Credenciais de acesso:')
  console.log('')
  console.log('  Super Admin')
  console.log('    Email:  admin@myagendix.com')
  console.log('    Senha:  Admin@123456')
  console.log('')
  console.log('  Gestor — Clínica Demo')
  console.log('    URL:    /t/clinica-demo/')
  console.log('    Email:  gestor@clinica-demo.com')
  console.log('    Senha:  Gestor@123456')
  console.log('─────────────────────────────────────────────────────\n')
}

main()
  .catch((err) => {
    console.error('\n❌ Seed falhou:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
