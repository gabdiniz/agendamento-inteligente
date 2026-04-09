import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  createWaitlistEntrySchema,
  paginationSchema,
  uuidSchema,
} from '@myagendix/shared'

import { AddToWaitlistUseCase } from '../../../application/use-cases/waitlist/add-to-waitlist.use-case.js'
import { ListWaitlistUseCase } from '../../../application/use-cases/waitlist/list-waitlist.use-case.js'
import { GetWaitlistEntryUseCase } from '../../../application/use-cases/waitlist/get-waitlist-entry.use-case.js'
import { CheckVacanciesUseCase } from '../../../application/use-cases/waitlist/check-vacancies.use-case.js'
import { ConfirmWaitlistEntryUseCase } from '../../../application/use-cases/waitlist/confirm-waitlist-entry.use-case.js'
import { ExpireWaitlistEntryUseCase } from '../../../application/use-cases/waitlist/expire-waitlist-entry.use-case.js'
import { RemoveFromWaitlistUseCase } from '../../../application/use-cases/waitlist/remove-from-waitlist.use-case.js'

import { PrismaWaitlistRepository } from '../../database/repositories/prisma-waitlist.repository.js'
import { PrismaPatientRepository } from '../../database/repositories/prisma-patient.repository.js'
import { PrismaProcedureRepository } from '../../database/repositories/prisma-procedure.repository.js'
import { PrismaProfessionalRepository } from '../../database/repositories/prisma-professional.repository.js'

import { requireAuth, requireRoles } from '../middlewares/auth.middleware.js'

// ─── Waitlist Routes ──────────────────────────────────────────────────────────
//
// GET    /t/:slug/waitlist                         → listar (GESTOR | RECEPCAO)
// GET    /t/:slug/waitlist/:id                     → buscar (GESTOR | RECEPCAO)
// POST   /t/:slug/waitlist                         → entrar na lista (público ou interno)
// POST   /t/:slug/waitlist/check-vacancies         → notificar candidatos (GESTOR | RECEPCAO)
// PATCH  /t/:slug/waitlist/:id/confirm             → confirmar vaga (GESTOR | RECEPCAO)
// PATCH  /t/:slug/waitlist/:id/expire              → expirar notificação (GESTOR | RECEPCAO)
// PATCH  /t/:slug/waitlist/:id/remove              → remover da lista (GESTOR | RECEPCAO)
// ─────────────────────────────────────────────────────────────────────────────

const listQuerySchema = paginationSchema.extend({
  status: z
    .enum(['WAITING', 'NOTIFIED', 'CONFIRMED', 'EXPIRED', 'REMOVED'])
    .optional(),
  procedureId: uuidSchema.optional(),
  professionalId: uuidSchema.optional(),
  patientId: uuidSchema.optional(),
})

const checkVacanciesSchema = z.object({
  procedureId: z.string().uuid(),
  professionalId: z.string().uuid().optional(),
  vacancyDate: z.string().date(),
  vacancyStartTime: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/),
})

const confirmBodySchema = z.object({
  appointmentId: z.string().uuid().optional(),
})

export const waitlistRoutes: FastifyPluginAsync = async (app) => {
  // ─── GET / ────────────────────────────────────────────────
  app.get(
    '/',
    { preHandler: [requireAuth, requireRoles('GESTOR', 'RECEPCAO')] },
    async (request, reply) => {
      const query = listQuerySchema.parse(request.query)
      const repo = new PrismaWaitlistRepository(request.tenantPrisma!)

      const result = await new ListWaitlistUseCase(repo).execute(query)

      return reply.status(200).send({
        success: true,
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      })
    },
  )

  // ─── GET /:id ─────────────────────────────────────────────
  app.get(
    '/:id',
    { preHandler: [requireAuth, requireRoles('GESTOR', 'RECEPCAO')] },
    async (request, reply) => {
      const params = request.params as Record<string, string>
      const id = uuidSchema.parse(params['id'])
      const repo = new PrismaWaitlistRepository(request.tenantPrisma!)

      const entry = await new GetWaitlistEntryUseCase(repo).execute(id)

      return reply.status(200).send({ success: true, data: entry })
    },
  )

  // ─── POST / ───────────────────────────────────────────────
  // Não requer auth — aceita entradas vindas da página pública de agendamento.
  // Se chamado de dentro do painel, o preHandler de auth já terá rodado antes
  // (o tenant plugin é aplicado para todo /t/:slug/*).
  app.post('/', async (request, reply) => {
    const body = createWaitlistEntrySchema.parse(request.body)
    const prisma = request.tenantPrisma!

    const entry = await new AddToWaitlistUseCase(
      new PrismaWaitlistRepository(prisma),
      new PrismaPatientRepository(prisma),
      new PrismaProcedureRepository(prisma),
      new PrismaProfessionalRepository(prisma),
    ).execute(body)

    return reply.status(201).send({ success: true, data: entry })
  })

  // ─── POST /check-vacancies ────────────────────────────────
  // Disparado manualmente pela staff quando um agendamento é cancelado,
  // ou automaticamente pelo handler de cancelamento (extensão futura).
  app.post(
    '/check-vacancies',
    { preHandler: [requireAuth, requireRoles('GESTOR', 'RECEPCAO')] },
    async (request, reply) => {
      const body = checkVacanciesSchema.parse(request.body)
      const repo = new PrismaWaitlistRepository(request.tenantPrisma!)

      const notified = await new CheckVacanciesUseCase(repo).execute(body)

      return reply.status(200).send({
        success: true,
        data: notified,
        meta: { notifiedCount: notified.length },
      })
    },
  )

  // ─── PATCH /:id/confirm ───────────────────────────────────
  app.patch(
    '/:id/confirm',
    { preHandler: [requireAuth, requireRoles('GESTOR', 'RECEPCAO')] },
    async (request, reply) => {
      const params = request.params as Record<string, string>
      const id = uuidSchema.parse(params['id'])
      const body = confirmBodySchema.parse(request.body ?? {})
      const repo = new PrismaWaitlistRepository(request.tenantPrisma!)

      const entry = await new ConfirmWaitlistEntryUseCase(repo).execute({
        id,
        appointmentId: body.appointmentId,
      })

      return reply.status(200).send({ success: true, data: entry })
    },
  )

  // ─── PATCH /:id/expire ────────────────────────────────────
  app.patch(
    '/:id/expire',
    { preHandler: [requireAuth, requireRoles('GESTOR', 'RECEPCAO')] },
    async (request, reply) => {
      const params = request.params as Record<string, string>
      const id = uuidSchema.parse(params['id'])
      const repo = new PrismaWaitlistRepository(request.tenantPrisma!)

      const entry = await new ExpireWaitlistEntryUseCase(repo).execute(id)

      return reply.status(200).send({ success: true, data: entry })
    },
  )

  // ─── PATCH /:id/remove ────────────────────────────────────
  app.patch(
    '/:id/remove',
    { preHandler: [requireAuth, requireRoles('GESTOR', 'RECEPCAO')] },
    async (request, reply) => {
      const params = request.params as Record<string, string>
      const id = uuidSchema.parse(params['id'])
      const repo = new PrismaWaitlistRepository(request.tenantPrisma!)

      const entry = await new RemoveFromWaitlistUseCase(repo).execute(id)

      return reply.status(200).send({ success: true, data: entry })
    },
  )
}
