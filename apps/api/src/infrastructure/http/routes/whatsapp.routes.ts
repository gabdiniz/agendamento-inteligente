// ─── WhatsApp Routes ──────────────────────────────────────────────────────────
//
// Registradas em /t/:slug/whatsapp/*
// Todas requerem autenticação; as de configuração requerem GESTOR.
//
// GET    /config              → busca config atual do tenant
// PUT    /config              → salva instanceId, token, enabled, reminderHours
// GET    /templates           → lista todos os 4 templates
// PUT    /templates/:event    → atualiza body de um template
// POST   /test                → envia mensagem de teste para número informado
// GET    /jobs                → lista histórico de jobs (filtros por status/evento)
// ─────────────────────────────────────────────────────────────────────────────

import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '@myagendix/database'
import { requireAuth, requireRoles } from '../middlewares/auth.middleware.js'
import { WhatsappService, DEFAULT_TEMPLATES } from '../../../application/services/whatsapp.service.js'
import { ZApiClient } from '../../external/zapi.client.js'
import { PhoneFormatterService } from '../../../application/services/phone-formatter.service.js'

const gestorGuard = [requireAuth, requireRoles('GESTOR')]

const configSchema = z.object({
  whatsappEnabled:     z.boolean(),
  zApiInstanceId:      z.string().max(255).nullable().optional(),
  zApiToken:           z.string().max(255).nullable().optional(),
  reminderHoursBefore: z.number().int().min(1).max(168).optional(), // max 7 dias
})

const templateSchema = z.object({
  body:     z.string().min(10).max(2000),
  isActive: z.boolean().optional(),
})

const testSchema = z.object({
  phone:   z.string().min(10).max(20),
  message: z.string().min(1).max(500).optional(),
})

const jobsQuerySchema = z.object({
  status: z.enum(['PENDING', 'SENDING', 'SENT', 'FAILED', 'CANCELED']).optional(),
  event:  z.enum(['CONFIRMATION', 'REMINDER', 'CANCELLATION', 'RESCHEDULE']).optional(),
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
})

const VALID_EVENTS = ['CONFIRMATION', 'REMINDER', 'CANCELLATION', 'RESCHEDULE'] as const

export const whatsappRoutes: FastifyPluginAsync = async (app) => {

  // ─── GET /config ───────────────────────────────────────────
  app.get('/config', { preHandler: gestorGuard }, async (request, reply) => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: request.tenantId },
      select: {
        whatsappEnabled:     true,
        zApiInstanceId:      true,
        zApiToken:           true,
        reminderHoursBefore: true,
      },
    })

    if (!tenant) {
      return reply.status(404).send({ success: false, error: 'Tenant não encontrado' })
    }

    // Mascara o token por segurança (envia apenas os últimos 6 chars)
    const maskedToken = tenant.zApiToken
      ? `${'*'.repeat(Math.max(0, tenant.zApiToken.length - 6))}${tenant.zApiToken.slice(-6)}`
      : null

    return reply.status(200).send({
      success: true,
      data: {
        whatsappEnabled:     tenant.whatsappEnabled,
        zApiInstanceId:      tenant.zApiInstanceId,
        zApiToken:           maskedToken,
        reminderHoursBefore: tenant.reminderHoursBefore,
        hasCredentials:      Boolean(tenant.zApiInstanceId && tenant.zApiToken),
      },
    })
  })

  // ─── PUT /config ───────────────────────────────────────────
  app.put('/config', { preHandler: gestorGuard }, async (request, reply) => {
    const body = configSchema.parse(request.body)

    const updateData: Record<string, unknown> = {
      whatsappEnabled: body.whatsappEnabled,
    }

    if (body.zApiInstanceId !== undefined) updateData['zApiInstanceId'] = body.zApiInstanceId
    if (body.zApiToken !== undefined)      updateData['zApiToken']      = body.zApiToken
    if (body.reminderHoursBefore !== undefined) updateData['reminderHoursBefore'] = body.reminderHoursBefore

    await prisma.tenant.update({
      where: { id: request.tenantId },
      data: updateData,
    })

    // Se estiver ativando pela primeira vez, garante que os templates existem
    if (body.whatsappEnabled) {
      const svc = new WhatsappService(request.tenantPrisma)
      await svc.ensureDefaultTemplates()
    }

    return reply.status(200).send({ success: true, message: 'Configuração salva com sucesso' })
  })

  // ─── GET /templates ────────────────────────────────────────
  app.get('/templates', { preHandler: gestorGuard }, async (request, reply) => {
    const templates = await (request.tenantPrisma as any).whatsappTemplate.findMany({
      orderBy: { event: 'asc' },
    })

    // Garante que retorna os 4 eventos mesmo que algum ainda não exista no banco
    const result = VALID_EVENTS.map((event) => {
      const found = templates.find((t: any) => t.event === event)
      return found ?? {
        id:       null,
        event,
        body:     DEFAULT_TEMPLATES[event] ?? '',
        isActive: true,
      }
    })

    return reply.status(200).send({ success: true, data: result })
  })

  // ─── PUT /templates/:event ─────────────────────────────────
  app.put('/templates/:event', { preHandler: gestorGuard }, async (request, reply) => {
    const params = request.params as Record<string, string>
    const event = params['event']?.toUpperCase()

    if (!VALID_EVENTS.includes(event as typeof VALID_EVENTS[number])) {
      return reply.status(400).send({ success: false, error: `Evento inválido. Use: ${VALID_EVENTS.join(', ')}` })
    }

    const body = templateSchema.parse(request.body)

    const updated = await (request.tenantPrisma as any).whatsappTemplate.upsert({
      where:  { event },
      create: { event, body: body.body, isActive: body.isActive ?? true },
      update: { body: body.body, ...(body.isActive !== undefined && { isActive: body.isActive }) },
    })

    return reply.status(200).send({ success: true, data: updated })
  })

  // ─── POST /test ────────────────────────────────────────────
  app.post('/test', { preHandler: gestorGuard }, async (request, reply) => {
    const body = testSchema.parse(request.body)

    const tenant = await prisma.tenant.findUnique({
      where: { id: request.tenantId },
      select: { zApiInstanceId: true, zApiToken: true, name: true },
    })

    if (!tenant?.zApiInstanceId || !tenant?.zApiToken) {
      return reply.status(422).send({
        success: false,
        error: 'Configure o Instance ID e Token do Z-API antes de testar.',
      })
    }

    const formatter = new PhoneFormatterService()
    const phone = formatter.format(body.phone)
    if (!phone) {
      return reply.status(422).send({ success: false, error: 'Número de telefone inválido.' })
    }

    const message = body.message ?? `✅ *Teste de conexão — ${tenant.name}*\n\nSe você recebeu esta mensagem, a integração WhatsApp está funcionando corretamente!`

    try {
      const zapi = new ZApiClient()
      await zapi.sendText(tenant.zApiInstanceId, tenant.zApiToken, phone, message)
      return reply.status(200).send({ success: true, message: 'Mensagem de teste enviada com sucesso.' })
    } catch (err) {
      return reply.status(422).send({
        success: false,
        error: `Falha ao enviar: ${err instanceof Error ? err.message : String(err)}`,
      })
    }
  })

  // ─── GET /jobs ─────────────────────────────────────────────
  app.get('/jobs', { preHandler: gestorGuard }, async (request, reply) => {
    const query = jobsQuerySchema.parse(request.query)

    const where: Record<string, unknown> = {}
    if (query.status) where['status'] = query.status
    if (query.event)  where['event']  = query.event

    const skip = (query.page - 1) * query.limit

    const [jobs, total] = await Promise.all([
      (request.tenantPrisma as any).whatsappJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      (request.tenantPrisma as any).whatsappJob.count({ where }),
    ])

    return reply.status(200).send({
      success: true,
      data: jobs,
      meta: {
        total,
        page:       query.page,
        limit:      query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    })
  })
}
