import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { UpsertWorkScheduleUseCase } from '../../../application/use-cases/work-schedule/upsert-work-schedule.use-case.js'
import { ListWorkScheduleUseCase } from '../../../application/use-cases/work-schedule/list-work-schedule.use-case.js'
import { DeleteWorkScheduleDayUseCase } from '../../../application/use-cases/work-schedule/delete-work-schedule-day.use-case.js'
import { ToggleWorkScheduleDayUseCase } from '../../../application/use-cases/work-schedule/toggle-work-schedule-day.use-case.js'
import { PrismaWorkScheduleRepository } from '../../database/repositories/prisma-work-schedule.repository.js'
import { PrismaProfessionalRepository } from '../../database/repositories/prisma-professional.repository.js'
import { requireAuth, requireRoles } from '../middlewares/auth.middleware.js'

// ─── Work Schedule Routes (nested under /professionals/:professionalId) ────────
//
// GET    /t/:slug/professionals/:professionalId/schedule           → listar (requireAuth)
// PUT    /t/:slug/professionals/:professionalId/schedule/:day      → upsert dia (GESTOR)
// DELETE /t/:slug/professionals/:professionalId/schedule/:day      → remover dia (GESTOR)
// PATCH  /t/:slug/professionals/:professionalId/schedule/:day/activate   → ativar (GESTOR)
// PATCH  /t/:slug/professionals/:professionalId/schedule/:day/deactivate → desativar (GESTOR)
// ─────────────────────────────────────────────────────────────────────────────
//
// :day = número inteiro 0–6 (0=Dom, 1=Seg, ..., 6=Sab)
// ─────────────────────────────────────────────────────────────────────────────

const dayOfWeekSchema = z.coerce
  .number()
  .int()
  .min(0)
  .max(6, { message: 'dayOfWeek deve ser entre 0 (Dom) e 6 (Sab)' })

const upsertBodySchema = z.object({
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime deve estar no formato HH:MM' }),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'endTime deve estar no formato HH:MM' }),
  slotIntervalMinutes: z.number().int().min(5).max(120).optional(),
})

export const workScheduleRoutes: FastifyPluginAsync = async (app) => {
  // GET /  → list schedule for a professional
  app.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as Record<string, string>
    const professionalId = params['professionalId']!

    const scheduleRepo = new PrismaWorkScheduleRepository(request.tenantPrisma!)
    const professionalRepo = new PrismaProfessionalRepository(request.tenantPrisma!)

    const schedule = await new ListWorkScheduleUseCase(scheduleRepo, professionalRepo).execute(professionalId)

    return reply.status(200).send({ success: true, data: schedule })
  })

  // PUT /:day → upsert a specific day
  app.put('/:day', { preHandler: [requireAuth, requireRoles('GESTOR')] }, async (request, reply) => {
    const params = request.params as Record<string, string>
    const professionalId = params['professionalId']!
    const dayOfWeek = dayOfWeekSchema.parse(params['day'])
    const body = upsertBodySchema.parse(request.body)

    const scheduleRepo = new PrismaWorkScheduleRepository(request.tenantPrisma!)
    const professionalRepo = new PrismaProfessionalRepository(request.tenantPrisma!)

    const record = await new UpsertWorkScheduleUseCase(scheduleRepo, professionalRepo).execute({
      professionalId,
      dayOfWeek,
      ...body,
    })

    return reply.status(200).send({ success: true, data: record })
  })

  // DELETE /:day → remove a specific day
  app.delete('/:day', { preHandler: [requireAuth, requireRoles('GESTOR')] }, async (request, reply) => {
    const params = request.params as Record<string, string>
    const professionalId = params['professionalId']!
    const dayOfWeek = dayOfWeekSchema.parse(params['day'])

    const scheduleRepo = new PrismaWorkScheduleRepository(request.tenantPrisma!)
    const professionalRepo = new PrismaProfessionalRepository(request.tenantPrisma!)

    await new DeleteWorkScheduleDayUseCase(scheduleRepo, professionalRepo).execute(professionalId, dayOfWeek)

    return reply.status(204).send()
  })

  // PATCH /:day/activate → activate a specific day
  app.patch('/:day/activate', { preHandler: [requireAuth, requireRoles('GESTOR')] }, async (request, reply) => {
    const params = request.params as Record<string, string>
    const professionalId = params['professionalId']!
    const dayOfWeek = dayOfWeekSchema.parse(params['day'])

    const scheduleRepo = new PrismaWorkScheduleRepository(request.tenantPrisma!)
    const professionalRepo = new PrismaProfessionalRepository(request.tenantPrisma!)

    const record = await new ToggleWorkScheduleDayUseCase(scheduleRepo, professionalRepo).execute(
      professionalId,
      dayOfWeek,
      true,
    )

    return reply.status(200).send({ success: true, data: record })
  })

  // PATCH /:day/deactivate → deactivate a specific day
  app.patch('/:day/deactivate', { preHandler: [requireAuth, requireRoles('GESTOR')] }, async (request, reply) => {
    const params = request.params as Record<string, string>
    const professionalId = params['professionalId']!
    const dayOfWeek = dayOfWeekSchema.parse(params['day'])

    const scheduleRepo = new PrismaWorkScheduleRepository(request.tenantPrisma!)
    const professionalRepo = new PrismaProfessionalRepository(request.tenantPrisma!)

    const record = await new ToggleWorkScheduleDayUseCase(scheduleRepo, professionalRepo).execute(
      professionalId,
      dayOfWeek,
      false,
    )

    return reply.status(200).send({ success: true, data: record })
  })
}
