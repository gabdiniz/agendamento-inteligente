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
import { CheckVacanciesUseCase } from '../../../application/use-cases/waitlist/check-vacancies.use-case.js'

import { PrismaAppointmentRepository } from '../../database/repositories/prisma-appointment.repository.js'
import { PrismaProfessionalRepository } from '../../database/repositories/prisma-professional.repository.js'
import { PrismaProcedureRepository } from '../../database/repositories/prisma-procedure.repository.js'
import { PrismaPatientRepository } from '../../database/repositories/prisma-patient.repository.js'
import { PrismaWorkScheduleRepository } from '../../database/repositories/prisma-work-schedule.repository.js'
import { PrismaWaitlistRepository } from '../../database/repositories/prisma-waitlist.repository.js'
import { PrismaNotificationRepository } from '../../database/repositories/prisma-notification.repository.js'

import { requireAuth, requireRoles } from '../middlewares/auth.middleware.js'
import { prisma } from '@myagendix/database'
import { WhatsappService } from '../../../application/services/whatsapp.service.js'

// ─── Appointment Routes ───────────────────────────────────────────────────────
//
// GET    /t/:slug/appointments                   → listar (requireAuth)
// GET    /t/:slug/appointments/:id               → buscar (requireAuth)
// POST   /t/:slug/appointments                   → criar (GESTOR | RECEPCAO)
// PATCH  /t/:slug/appointments/:id               → editar notas / reagendar (GESTOR | RECEPCAO)
// PATCH  /t/:slug/appointments/:id/status        → mudar status (GESTOR | RECEPCAO | PROFISSIONAL)
// POST   /t/:slug/appointments/:id/cancel        → cancelar (GESTOR | RECEPCAO)
// ─────────────────────────────────────────────────────────────────────────────

const listQuerySchema = paginationSchema.extend({
  professionalId: uuidSchema.optional(),
  patientId: uuidSchema.optional(),
  scheduledDate: z.string().date().optional(),
  startDate: z.string().date().optional(),   // início do intervalo (para visão de calendário)
  endDate: z.string().date().optional(),     // fim do intervalo
  status: z
    .enum(['SCHEDULED', 'PATIENT_PRESENT', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'])
    .optional(),
})

const updateStatusBodySchema = z.object({
  status: z.enum(['PATIENT_PRESENT', 'IN_PROGRESS', 'COMPLETED', 'CANCELED']),
  notes: z.string().optional(),
})

const updateAppointmentBodySchema = z.object({
  scheduledDate: z.string().date().optional(),
  startTime: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/).optional(),
  notes: z.string().nullable().optional(),
})

// ─── WhatsApp helpers ─────────────────────────────────────────────────────────

/** Cache simples de nome de clínica para não bater no banco a cada agendamento. */
const clinicNameCache = new Map<string, { name: string; ttl: number }>()

async function getClinicInfo(tenantId: string): Promise<{
  name: string
  whatsappEnabled: boolean
  zApiInstanceId: string | null
  zApiToken: string | null
  reminderHoursBefore: number
} | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      name: true,
      whatsappEnabled: true,
      zApiInstanceId: true,
      zApiToken: true,
      reminderHoursBefore: true,
    },
  })
  return tenant ?? null
}

// Dispara o hook WhatsApp em background — nunca bloqueia a resposta HTTP
function fireWhatsapp(fn: () => Promise<void>): void {
  fn().catch((err) => console.error('[WhatsApp] Erro ao enfileirar job:', err))
}

// ─────────────────────────────────────────────────────────────────────────────

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

  // ─── PATCH /:id — editar notas / reagendar ────────────────
  app.patch('/:id', { preHandler: [requireAuth, requireRoles('GESTOR', 'RECEPCAO')] }, async (request, reply) => {
    const params = request.params as Record<string, string>
    const id = uuidSchema.parse(params['id'])
    const body = updateAppointmentBodySchema.parse(request.body)
    const prisma = request.tenantPrisma!

    // Funções de conversão inline (necessário sem expor helpers do repository)
    function timeStringToDate(time: string): Date {
      return new Date(`1970-01-01T${time}:00.000Z`)
    }
    function dateStringToDate(dateStr: string): Date {
      return new Date(`${dateStr}T00:00:00.000Z`)
    }

    // Busca o agendamento existente para calcular endTime
    const existing = await prisma.appointment.findUnique({
      where: { id },
      include: { procedure: { select: { durationMinutes: true } } },
    })
    if (!existing) {
      return reply.status(404).send({ success: false, error: 'Agendamento não encontrado' })
    }

    const newStartTime = body.startTime ? timeStringToDate(body.startTime) : existing.startTime
    const durationMs = existing.procedure.durationMinutes * 60 * 1000
    const newEndTime = new Date(newStartTime.getTime() + durationMs)

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        ...(body.scheduledDate && { scheduledDate: dateStringToDate(body.scheduledDate) }),
        ...(body.startTime && { startTime: newStartTime, endTime: newEndTime }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
      select: {
        id: true, patientId: true, professionalId: true, procedureId: true,
        scheduledDate: true, startTime: true, endTime: true,
        status: true, cancellationReason: true, canceledBy: true,
        notes: true, createdByUserId: true, createdAt: true, updatedAt: true,
        patient:      { select: { id: true, name: true, phone: true } },
        professional: { select: { id: true, name: true, specialty: true } },
        procedure:    { select: { id: true, name: true, durationMinutes: true, color: true } },
      },
    })

    // Serializar datas para strings
    const toTimeStr = (d: Date) => d.toISOString().slice(11, 16)
    const toDateStr = (d: Date) => d.toISOString().slice(0, 10)

    const isRescheduled = body.scheduledDate !== undefined || body.startTime !== undefined

    // ── WhatsApp: notificação de reagendamento ────────────────
    if (isRescheduled) {
      fireWhatsapp(async () => {
        const clinic = await getClinicInfo(request.tenantId)
        if (!clinic?.whatsappEnabled) return

        const svc = new WhatsappService(request.tenantPrisma)
        await svc.enqueueReschedule(
          {
            id:               updated.id,
            scheduledDate:    updated.scheduledDate,
            startTime:        updated.startTime,
            patientName:      updated.patient.name,
            patientPhone:     updated.patient.phone ?? null,
            professionalName: updated.professional.name,
            procedureName:    updated.procedure.name,
            clinicName:       clinic.name,
          },
          clinic.reminderHoursBefore,
        )
      })
    }

    return reply.status(200).send({
      success: true,
      data: {
        ...updated,
        scheduledDate: toDateStr(updated.scheduledDate),
        startTime: toTimeStr(updated.startTime),
        endTime: toTimeStr(updated.endTime),
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    })
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
      createdByUserId: request.currentUser?.sub,
    })

    // ── WhatsApp: confirmação + lembrete ──────────────────────
    fireWhatsapp(async () => {
      const clinic = await getClinicInfo(request.tenantId)
      if (!clinic?.whatsappEnabled) return

      const svc = new WhatsappService(request.tenantPrisma)
      await svc.enqueueConfirmation(
        {
          id:              appointment.id,
          scheduledDate:   new Date(`${appointment.scheduledDate}T00:00:00Z`),
          startTime:       new Date(`1970-01-01T${appointment.startTime}:00Z`),
          patientName:     appointment.patient.name,
          patientPhone:    appointment.patient.phone ?? null,
          professionalName: appointment.professional.name,
          procedureName:   appointment.procedure.name,
          clinicName:      clinic.name,
        },
        clinic.reminderHoursBefore,
      )
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
      const prisma = request.tenantPrisma!
      const repo = new PrismaAppointmentRepository(prisma)

      const checkVacancies = new CheckVacanciesUseCase(
        new PrismaWaitlistRepository(prisma),
        new PrismaNotificationRepository(prisma),
      )

      const appointment = await new UpdateAppointmentStatusUseCase(repo, checkVacancies).execute({
        appointmentId: id,
        newStatus: body.status,
        changedByUserId: request.currentUser?.sub,
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
      const prisma = request.tenantPrisma!
      const repo = new PrismaAppointmentRepository(prisma)

      const checkVacancies = new CheckVacanciesUseCase(
        new PrismaWaitlistRepository(prisma),
        new PrismaNotificationRepository(prisma),
      )

      const appointment = await new CancelAppointmentUseCase(repo, checkVacancies).execute({
        appointmentId: id,
        reason: body.reason,
        canceledBy: 'STAFF',
        changedByUserId: request.currentUser?.sub,
      })

      // ── WhatsApp: notificação de cancelamento ─────────────
      fireWhatsapp(async () => {
        const clinic = await getClinicInfo(request.tenantId)
        if (!clinic?.whatsappEnabled) return

        const svc = new WhatsappService(request.tenantPrisma)
        await svc.enqueueCancellation({
          id:               appointment.id,
          scheduledDate:    new Date(`${appointment.scheduledDate}T00:00:00Z`),
          startTime:        new Date(`1970-01-01T${appointment.startTime}:00Z`),
          patientName:      appointment.patient.name,
          patientPhone:     appointment.patient.phone ?? null,
          professionalName: appointment.professional.name,
          procedureName:    appointment.procedure.name,
          clinicName:       clinic.name,
        })
      })

      return reply.status(200).send({ success: true, data: appointment })
    },
  )
}
