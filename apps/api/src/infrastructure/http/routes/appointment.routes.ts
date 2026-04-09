import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  createAppointmentSchema,
  cancelAppointmentSchema,
  paginationSchema,
  uuidSchema,
} from '@myagendix/shared'

import { CreateAppointmentUseCase } from '../../../application/use-cases/appointment/create-appointment.use-case.js'
import { ListAppointmentsUseCase } from '../../../application/use-cases/appointment/list-appointments.use-case.js'
import { GetAppointmentUseCase } from '../../../application/use-cases/appointment/get-appointment.use-case.js'
import { UpdateAppointmentStatusUseCase } from '../../../application/use-cases/appointment/update-appointment-status.use-case.js'
import { CancelAppointmentUseCase } from '../../../application/use-cases/appointment/cancel-appointment.use-case.js'

import { PrismaAppointmentRepository } from '../../database/repositories/prisma-appointment.repository.js'
import { PrismaProfessionalRepository } from '../../database/repositories/prisma-professional.repository.js'
import { PrismaProcedureRepository } from '../../database/repositories/prisma-procedure.repository.js'
import { PrismaPatientRepository } from '../../database/repositories/prisma-patient.repository.js'
import { PrismaWorkScheduleRepository } from '../../database/repositories/prisma-work-schedule.repository.js'

import { requireAuth, requireRoles } from '../middlewares/auth.middleware.js'

// ─── Appointment Routes ───────────────────────────────────────────────────────
//
// GET    /t/:slug/appointments                   → listar (requireAuth)
// GET    /t/:slug/appointments/:id               → buscar (requireAuth)
// POST   /t/:slug/appointments                   → criar (GESTOR | RECEPCAO)
// PATCH  /t/:slug/appointments/:id/status        → mudar status (GESTOR | RECEPCAO | PROFISSIONAL)
// POST   /t/:slug/appointments/:id/cancel        → cancelar (GESTOR | RECEPCAO)
// ─────────────────────────────────────────────────────────────────────────────

const listQuerySchema = paginationSchema.extend({
  professionalId: uuidSchema.optional(),
  patientId: uuidSchema.optional(),
  scheduledDate: z.string().date().optional(),
  status: z
    .enum(['SCHEDULED', 'PATIENT_PRESENT', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'])
    .optional(),
})

const updateStatusBodySchema = z.object({
  status: z.enum(['PATIENT_PRESENT', 'IN_PROGRESS', 'COMPLETED', 'CANCELED']),
  notes: z.string().optional(),
})

export const appointmentRoutes: FastifyPluginAsync = async (app) => {
  // ─── GET / ────────────────────────────────────────────────
  app.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const query = listQuerySchema.parse(request.query)
    const repo = new PrismaAppointmentRepository(request.tenantPrisma!)

    const result = await new ListAppointmentsUseCase(repo).execute(query)

    return reply.status(200).send({
      success: true,
      data: result.data,
      meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages },
    })
  })

  // ─── GET /:id ─────────────────────────────────────────────
  app.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as Record<string, string>
    const id = uuidSchema.parse(params['id'])
    const repo = new PrismaAppointmentRepository(request.tenantPrisma!)

    const appointment = await new GetAppointmentUseCase(repo).execute(id)

    return reply.status(200).send({ success: true, data: appointment })
  })

  // ─── POST / ───────────────────────────────────────────────
  app.post('/', { preHandler: [requireAuth, requireRoles('GESTOR', 'RECEPCAO')] }, async (request, reply) => {
    const body = createAppointmentSchema.parse(request.body)
    const prisma = request.tenantPrisma!

    const appointment = await new CreateAppointmentUseCase(
      new PrismaAppointmentRepository(prisma),
      new PrismaProfessionalRepository(prisma),
      new PrismaProcedureRepository(prisma),
      new PrismaPatientRepository(prisma),
      new PrismaWorkScheduleRepository(prisma),
    ).execute({
      ...body,
      createdByUserId: request.currentUser?.id,
    })

    return reply.status(201).send({ success: true, data: appointment })
  })

  // ─── PATCH /:id/status ────────────────────────────────────
  app.patch(
    '/:id/status',
    { preHandler: [requireAuth, requireRoles('GESTOR', 'RECEPCAO', 'PROFISSIONAL')] },
    async (request, reply) => {
      const params = request.params as Record<string, string>
      const id = uuidSchema.parse(params['id'])
      const body = updateStatusBodySchema.parse(request.body)
      const repo = new PrismaAppointmentRepository(request.tenantPrisma!)

      const appointment = await new UpdateAppointmentStatusUseCase(repo).execute({
        appointmentId: id,
        newStatus: body.status,
        changedByUserId: request.currentUser?.id,
        notes: body.notes,
      })

      return reply.status(200).send({ success: true, data: appointment })
    },
  )

  // ─── POST /:id/cancel ─────────────────────────────────────
  app.post(
    '/:id/cancel',
    { preHandler: [requireAuth, requireRoles('GESTOR', 'RECEPCAO')] },
    async (request, reply) => {
      const params = request.params as Record<string, string>
      const id = uuidSchema.parse(params['id'])
      const body = cancelAppointmentSchema.parse(request.body)
      const repo = new PrismaAppointmentRepository(request.tenantPrisma!)

      const appointment = await new CancelAppointmentUseCase(repo).execute({
        appointmentId: id,
        reason: body.reason,
        canceledBy: 'STAFF',
        changedByUserId: request.currentUser?.id,
      })

      return reply.status(200).send({ success: true, data: appointment })
    },
  )
}
