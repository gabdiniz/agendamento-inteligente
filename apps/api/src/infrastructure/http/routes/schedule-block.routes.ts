// ─── Schedule Block Routes ────────────────────────────────────────────────────
//
// Gerencia bloqueios pontuais na agenda de um profissional (férias, feriados,
// indisponibilidades). Um bloco impede a geração de slots no período informado.
//
// Registradas em /professionals/:professionalId/schedule/blocks
// Todas requerem autenticação; POST e DELETE exigem GESTOR ou RECEPCAO.
//
// GET    /              → lista bloqueios do profissional (com filtros de data)
// POST   /              → cria um bloqueio
// DELETE /:blockId      → remove um bloqueio
// ─────────────────────────────────────────────────────────────────────────────

import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth, requireRoles } from '../middlewares/auth.middleware.js'

const createBlockSchema = z.object({
  startDatetime: z.string().datetime({ offset: true }),
  endDatetime:   z.string().datetime({ offset: true }),
  reason:        z.string().max(255).optional(),
}).refine((b) => b.startDatetime < b.endDatetime, {
  message: 'startDatetime deve ser anterior a endDatetime',
  path: ['endDatetime'],
})

const listQuerySchema = z.object({
  from:  z.string().datetime({ offset: true }).optional(),
  until: z.string().datetime({ offset: true }).optional(),
})

const writeGuard = [requireAuth, requireRoles('GESTOR', 'RECEPCAO')]

export const scheduleBlockRoutes: FastifyPluginAsync = async (app) => {

  // ─── GET / ─────────────────────────────────────────────────
  app.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const params     = request.params as Record<string, string>
    const profId     = params['professionalId']
    const query      = listQuerySchema.parse(request.query)
    const db         = request.tenantPrisma as any

    const where: Record<string, unknown> = { professionalId: profId }

    if (query.from) {
      where['endDatetime'] = { gte: new Date(query.from) }
    }
    if (query.until) {
      where['startDatetime'] = { ...(where['startDatetime'] as object ?? {}), lte: new Date(query.until) }
    }

    const blocks = await db.scheduleBlock.findMany({
      where,
      orderBy: { startDatetime: 'asc' },
    })

    return reply.status(200).send({ success: true, data: blocks })
  })

  // ─── POST / ────────────────────────────────────────────────
  app.post('/', { preHandler: writeGuard }, async (request, reply) => {
    const params = request.params as Record<string, string>
    const profId = params['professionalId']
    const body   = createBlockSchema.parse(request.body)
    const db     = request.tenantPrisma as any

    // Verifica se o profissional existe
    const prof = await db.professional.findUnique({ where: { id: profId }, select: { id: true } })
    if (!prof) {
      return reply.status(404).send({ success: false, error: 'Profissional não encontrado.' })
    }

    // Verifica conflito com bloqueios existentes (opcional — mais usabilidade que bloqueio hard)
    const overlap = await db.scheduleBlock.findFirst({
      where: {
        professionalId: profId,
        startDatetime:  { lt: new Date(body.endDatetime) },
        endDatetime:    { gt: new Date(body.startDatetime) },
      },
    })
    if (overlap) {
      return reply.status(409).send({
        success: false,
        error:   'Já existe um bloqueio que se sobrepõe a este período.',
      })
    }

    const block = await db.scheduleBlock.create({
      data: {
        professionalId:  profId,
        startDatetime:   new Date(body.startDatetime),
        endDatetime:     new Date(body.endDatetime),
        reason:          body.reason ?? null,
        createdByUserId: request.userId!,
      },
    })

    return reply.status(201).send({ success: true, data: block })
  })

  // ─── DELETE /:blockId ──────────────────────────────────────
  app.delete('/:blockId', { preHandler: writeGuard }, async (request, reply) => {
    const params  = request.params as Record<string, string>
    const profId  = params['professionalId']
    const blockId = params['blockId']
    const db      = request.tenantPrisma as any

    const block = await db.scheduleBlock.findFirst({
      where: { id: blockId, professionalId: profId },
    })

    if (!block) {
      return reply.status(404).send({ success: false, error: 'Bloqueio não encontrado.' })
    }

    await db.scheduleBlock.delete({ where: { id: blockId } })

    return reply.status(200).send({ success: true, message: 'Bloqueio removido com sucesso.' })
  })
}
