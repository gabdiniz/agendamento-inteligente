// ─── Plan Management Routes ───────────────────────────────────────────────────
//
// GET    /super-admin/plans                    → listar planos (com features)
// POST   /super-admin/plans                    → criar plano
// PATCH  /super-admin/plans/:id                → editar nome/descrição
// DELETE /super-admin/plans/:id                → desativar plano
// GET    /super-admin/features                 → listar todas as features
// GET    /super-admin/plans/:id/features       → features de um plano
// PUT    /super-admin/plans/:id/features       → atribuir features (batch)
// PATCH  /super-admin/tenants/:id/plan         → trocar plano de um tenant
// ─────────────────────────────────────────────────────────────────────────────

import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '@myagendix/database'
import { z } from 'zod'
import { requireSuperAdmin } from '../middlewares/super-admin-auth.middleware.js'
import { NotFoundError } from '../../../domain/errors/app-error.js'

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createPlanSchema = z.object({
  name:        z.string().min(2).max(100),
  slug:        z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
  description: z.string().optional(),
})

const updatePlanSchema = z.object({
  name:        z.string().min(2).max(100).optional(),
  description: z.string().optional(),
  isActive:    z.boolean().optional(),
})

const setFeaturesSchema = z.object({
  featureSlugs: z.array(z.string()),
})

const assignPlanSchema = z.object({
  planId: z.string().uuid(),
})

// ─── Routes ──────────────────────────────────────────────────────────────────

export const planManagementRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireSuperAdmin)

  // ── GET /features ──────────────────────────────────────────────────────────

  app.get('/features', async (_request, reply) => {
    const features = await prisma.feature.findMany({
      where:   { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })
    return reply.send({ success: true, data: features })
  })

  // ── GET /plans ─────────────────────────────────────────────────────────────

  app.get('/plans', async (_request, reply) => {
    const plans = await prisma.plan.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        features: {
          include: { feature: true },
          orderBy: { feature: { name: 'asc' } },
        },
        _count: { select: { tenants: true } },
      },
    })

    const serialized = plans.map((p) => ({
      id:          p.id,
      name:        p.name,
      slug:        p.slug,
      description: p.description,
      isActive:    p.isActive,
      createdAt:   p.createdAt,
      tenantCount: p._count.tenants,
      features:    p.features.map((pf) => pf.feature),
    }))

    return reply.send({ success: true, data: serialized })
  })

  // ── POST /plans ────────────────────────────────────────────────────────────

  app.post('/plans', async (request, reply) => {
    const body = createPlanSchema.parse(request.body)

    const existing = await prisma.plan.findUnique({ where: { slug: body.slug } })
    if (existing) {
      return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: `Já existe um plano com o slug "${body.slug}"` })
    }

    const plan = await prisma.plan.create({
      data: {
        name:        body.name,
        slug:        body.slug,
        description: body.description,
      },
    })

    return reply.status(201).send({ success: true, data: plan })
  })

  // ── GET /plans/:id ─────────────────────────────────────────────────────────

  app.get('/plans/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const plan = await prisma.plan.findUnique({
      where:   { id },
      include: {
        features: {
          include: { feature: true },
          orderBy: { feature: { name: 'asc' } },
        },
        _count: { select: { tenants: true } },
      },
    })

    if (!plan) throw new NotFoundError('Plano')

    return reply.send({
      success: true,
      data: {
        id:          plan.id,
        name:        plan.name,
        slug:        plan.slug,
        description: plan.description,
        isActive:    plan.isActive,
        createdAt:   plan.createdAt,
        tenantCount: plan._count.tenants,
        features:    plan.features.map((pf) => pf.feature),
      },
    })
  })

  // ── PATCH /plans/:id ───────────────────────────────────────────────────────

  app.patch('/plans/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = updatePlanSchema.parse(request.body)

    const plan = await prisma.plan.findUnique({ where: { id } })
    if (!plan) throw new NotFoundError('Plano')

    const updated = await prisma.plan.update({
      where: { id },
      data:  body,
    })

    return reply.send({ success: true, data: updated })
  })

  // ── DELETE /plans/:id ─────────────────────────────────────────────────────

  app.delete('/plans/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const plan = await prisma.plan.findUnique({
      where:   { id },
      include: { _count: { select: { tenants: true } } },
    })
    if (!plan) throw new NotFoundError('Plano')

    if (plan._count.tenants > 0) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: `Não é possível excluir — ${plan._count.tenants} tenant(s) usam este plano`,
      })
    }

    await prisma.plan.delete({ where: { id } })
    return reply.status(204).send()
  })

  // ── GET /plans/:id/features ────────────────────────────────────────────────

  app.get('/plans/:id/features', async (request, reply) => {
    const { id } = request.params as { id: string }

    const plan = await prisma.plan.findUnique({
      where:   { id },
      include: {
        features: { include: { feature: true } },
      },
    })

    if (!plan) throw new NotFoundError('Plano')

    return reply.send({
      success: true,
      data: plan.features.map((pf) => pf.feature),
    })
  })

  // ── PUT /plans/:id/features ────────────────────────────────────────────────
  // Substitui completamente a lista de features do plano.

  app.put('/plans/:id/features', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = setFeaturesSchema.parse(request.body)

    const plan = await prisma.plan.findUnique({ where: { id } })
    if (!plan) throw new NotFoundError('Plano')

    // Busca os ids das features pelo slug
    const features = await prisma.feature.findMany({
      where: { slug: { in: body.featureSlugs }, isActive: true },
      select: { id: true, slug: true },
    })

    const foundSlugs = features.map((f) => f.slug)
    const missingSlugs = body.featureSlugs.filter((s) => !foundSlugs.includes(s))
    if (missingSlugs.length > 0) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: `Features não encontradas: ${missingSlugs.join(', ')}`,
      })
    }

    // Substitui em transação
    await prisma.$transaction([
      prisma.planFeature.deleteMany({ where: { planId: id } }),
      prisma.planFeature.createMany({
        data: features.map((f) => ({ planId: id, featureId: f.id })),
        skipDuplicates: true,
      }),
    ])

    // Retorna o plano atualizado
    const updated = await prisma.plan.findUnique({
      where:   { id },
      include: { features: { include: { feature: true } } },
    })

    return reply.send({
      success: true,
      data: updated!.features.map((pf) => pf.feature),
    })
  })

  // ── PATCH /tenants/:id/plan ────────────────────────────────────────────────

  app.patch('/tenants/:id/plan', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = assignPlanSchema.parse(request.body)

    const [tenant, plan] = await Promise.all([
      prisma.tenant.findUnique({ where: { id } }),
      prisma.plan.findUnique({ where: { id: body.planId } }),
    ])

    if (!tenant) throw new NotFoundError('Tenant')
    if (!plan)   throw new NotFoundError('Plano')
    if (!plan.isActive) {
      return reply.status(400).send({
        statusCode: 400, error: 'Bad Request', message: 'Este plano está inativo',
      })
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data:  { planId: body.planId },
      include: { plan: true },
    })

    return reply.send({ success: true, data: { planId: updated.planId, plan: updated.plan } })
  })
}
