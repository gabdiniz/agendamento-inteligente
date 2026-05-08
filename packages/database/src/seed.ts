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
  console.log('📌 [1/6] Criando Super Admin...')

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

  // ─── 2. Features & Planos ──────────────────────────────────────────────
  console.log('\n📌 [2/6] Criando Features e Planos...')

  const featuresData = [
    { id: 'e781bfa7-a14c-49a0-bbb2-af2d18d0e15b', slug: 'public_booking',        name: 'Agendamento Público',       description: 'Página pública para pacientes agendarem online',              category: 'core' },
    { id: 'ca48132f-a573-4790-b992-4a33729b3936', slug: 'waitlist',               name: 'Lista de Espera',           description: 'Fila de espera inteligente com convites automáticos',         category: 'core' },
    { id: '3e50b71d-8aa5-45ef-9d77-36b7520c23be', slug: 'whatsapp',               name: 'WhatsApp / Notificações',   description: 'Envio de confirmações e lembretes via WhatsApp',              category: 'communication' },
    { id: 'd7ef49ae-1be2-4a2b-82ac-5f3b2decb9c6', slug: 'professionals_unlimited',name: 'Profissionais Ilimitados',  description: 'Sem limite de profissionais cadastrados',                     category: 'core' },
    { id: '18155048-66f7-427b-97ae-57bb2ec4f5e6', slug: 'crm',                    name: 'CRM Completo',              description: 'Histórico, classificação e métricas de pacientes',            category: 'crm' },
    { id: '7cc4c1eb-c2fa-4c8e-98ee-76669c911fc5', slug: 'campaigns',              name: 'Campanhas e Automações',    description: 'Disparos segmentados por tags, procedimento e data',          category: 'crm' },
    { id: '4f3bbf7f-179a-441a-a4eb-9b9921220f7a', slug: 'gamification',           name: 'Gamificação e Ranking',     description: 'Ranking e classificação de pacientes por engajamento',        category: 'crm' },
    { id: 'e0c8acca-96ae-4dd8-a042-38384884ebc4', slug: 'retention',              name: 'Retenção Automática',       description: 'Fluxos automáticos para reter pacientes inativos',            category: 'crm' },
    { id: '7f4231ea-1c8a-46e4-9e9c-c7ef079d7666', slug: 'segmentation_advanced',  name: 'Segmentação Avançada',      description: 'Filtros avançados para segmentar a base',                     category: 'crm' },
    { id: '8e16c363-7cfe-4616-ae14-7cfa1729e6bd', slug: 'payments',               name: 'Cobranças e Pagamentos',    description: 'Cobrança antecipada e gestão de pagamentos',                  category: 'billing' },
    { id: '624b3051-2d94-45cc-8993-fbaf6598d979', slug: 'payment_page',           name: 'Página de Pagamento',       description: 'Página personalizada para recebimento online',                category: 'billing' },
    { id: '122ce2df-8bee-4477-909b-6c2c2b47dc71', slug: 'reports_advanced',       name: 'Relatórios Avançados',      description: 'Análises detalhadas de receita, retenção e demanda',          category: 'reports' },
    { id: '948f8fca-c3c5-4d48-a075-6a00f0df4f0a', slug: 'ai_behavior',            name: 'Análise de Comportamento',  description: 'IA analisa padrões de comportamento dos pacientes',           category: 'ai' },
    { id: '90a005cf-4545-4663-bafe-b60b7b673e7d', slug: 'ai_assistant',           name: 'Assistente de IA',          description: 'IA configurável para atender pacientes',                      category: 'ai' },
    { id: '39318e33-5deb-4d35-a732-ce747cb88fc2', slug: 'ai_chat',                name: 'Chat Inteligente',          description: 'Chat com pacientes via IA integrada ao painel',              category: 'ai' },
    { id: '9770c00f-10a6-49b5-998d-e9090ce8c2bb', slug: 'ai_predictions',         name: 'Previsão de Retornos',      description: 'IA prevê cancelamentos e retornos prováveis',                 category: 'ai' },
    { id: '85b2dece-53ba-45a8-b0c8-664776eadc29', slug: 'ai_scheduling',          name: 'Sugestão de Horários (IA)', description: 'IA sugere melhores horários com base em padrões',             category: 'ai' },
    { id: '95e72ffb-418a-42b5-aa0b-f0981945eb3f', slug: 'integrations_advanced',  name: 'Integrações Avançadas',     description: 'Conectores com sistemas externos via API',                    category: 'integrations' },
    { id: 'ccd37161-4551-4177-9eba-0b6216aaaa72', slug: 'priority_support',       name: 'Suporte Prioritário',       description: 'Canal de suporte dedicado com SLA garantido',                category: 'support' },
  ]

  for (const f of featuresData) {
    await prisma.feature.upsert({
      where: { slug: f.slug },
      update: { name: f.name, description: f.description, category: f.category },
      create: { id: f.id, slug: f.slug, name: f.name, description: f.description, category: f.category, isActive: true },
    })
  }

  console.log(`  ✓ ${featuresData.length} features criadas/atualizadas`)

  const plansData = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Free',
      slug: 'free',
      description: 'Plano gratuito com funcionalidades essenciais',
      featureSlugs: ['public_booking', 'waitlist', 'whatsapp'],
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Pro',
      slug: 'pro',
      description: 'Plataforma de crescimento para clínicas',
      featureSlugs: [
        'public_booking', 'waitlist', 'whatsapp',
        'professionals_unlimited', 'crm', 'campaigns',
        'gamification', 'retention', 'segmentation_advanced',
        'payments', 'payment_page', 'reports_advanced',
      ],
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'Growth',
      slug: 'growth',
      description: 'Automação inteligente com IA',
      featureSlugs: [
        'public_booking', 'waitlist', 'whatsapp',
        'professionals_unlimited', 'crm', 'campaigns',
        'gamification', 'retention', 'segmentation_advanced',
        'payments', 'payment_page', 'reports_advanced',
        'ai_behavior', 'ai_assistant', 'ai_chat', 'ai_predictions', 'ai_scheduling',
        'integrations_advanced', 'priority_support',
      ],
    },
  ]

  for (const p of plansData) {
    const plan = await prisma.plan.upsert({
      where: { slug: p.slug },
      update: { name: p.name, description: p.description },
      create: { id: p.id, slug: p.slug, name: p.name, description: p.description, isActive: true },
    })

    // Reconecta features ao plano (limpa e recria para garantir consistência)
    await prisma.planFeature.deleteMany({ where: { planId: plan.id } })

    const features = await prisma.feature.findMany({ where: { slug: { in: p.featureSlugs } } })

    await prisma.planFeature.createMany({
      data: features.map((f) => ({ planId: plan.id, featureId: f.id })),
      skipDuplicates: true,
    })

    console.log(`  ✓ Plano "${p.name}" — ${features.length} features`)
  }

  // ─── 3. Tenant Demo ────────────────────────────────────────────────────
  console.log('\n📌 [3/6] Criando Tenant Demo...')

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
      planId: '00000000-0000-0000-0000-000000000001', // Free
      isActive: true,
    },
  })

  console.log(`  ✓ Tenant "${tenant.name}" (slug: ${tenant.slug}) criado`)

  // ─── 4. Schema + Tabelas do Tenant ─────────────────────────────────────
  console.log('\n📌 [4/6] Criando schema e tabelas do tenant...')

  await createTenantSchema(DEMO_SLUG)

  // ─── 5. Dados do Tenant ────────────────────────────────────────────────
  console.log('\n📌 [5/6] Populando dados do tenant...')

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

  // ─── 6. Resumo ─────────────────────────────────────────────────────────
  console.log('\n📌 [6/6] Seed concluído!\n')
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
