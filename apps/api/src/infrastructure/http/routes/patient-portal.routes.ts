import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { requirePatientAuth } from '../middlewares/patient-auth.middleware.js'

import { ListAppointmentsUseCase } from '../../../application/use-cases/appointment/list-appointments.use-case.js'
import { CreateAppointmentUseCase } from '../../../application/use-cases/appointment/create-appointment.use-case.js'
import { CancelAppointmentByPatientUseCase } from '../../../application/use-cases/patient-portal/cancel-appointment-by-patient.use-case.js'
import { GetClinicPatientConfigUseCase } from '../../../application/use-cases/patient-portal/get-clinic-patient-config.use-case.js'
import { SubmitQuickRatingUseCase } from '../../../application/use-cases/patient-portal/submit-quick-rating.use-case.js'

import { PrismaPatientRepository } from '../../database/repositories/prisma-patient.repository.js'
import { PrismaAppointmentRepository } from '../../database/repositories/prisma-appointment.repository.js'
import { PrismaProfessionalRepository } from '../../database/repositories/prisma-professional.repository.js'
import { PrismaProcedureRepository } from '../../database/repositories/prisma-procedure.repository.js'
import { PrismaWorkScheduleRepository } from '../../database/repositories/prisma-work-schedule.repository.js'
import { PrismaAppointmentEvaluationRepository } from '../../database/repositories/prisma-appointment-evaluation.repository.js'
import { PrismaPointsRepository } from '../../database/repositories/prisma-points.repository.js'

// ─── Patient Portal Routes ─────────────────────────────────────────────────────
//
// Todas as rotas exigem autenticacao de paciente (requirePatientAuth).
// Prefixo: /t/:slug/patient
//
// GET   /profile                         => dados do paciente autenticado
// PATCH /profile                         => atualiza dados editaveis
// GET   /appointments                    => lista agendamentos (filtros via query)
// GET   /appointments/:id                => detalhe de um agendamento
// POST  /appointments                    => novo agendamento (autenticado)
// POST  /appointments/:id/cancel         => cancelar agendamento
// POST  /appointments/:id/quick-rating   => avaliacao rapida (M9 V2)
// ──────────────────────────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  name:      z.string().min(2).max(255).optional(),
  phone:     z.string().min(10).max(20).optional(),
  email:     z.string().email().optional(),
  birthDate: z.string().date().optional(),
  gender:    z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  city:      z.string().max(255).optional(),
})

const listAppointmentsSchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(50).default(10),
  status:   z.string().optional(),
  upcoming: z.coerce.boolean().optional(),
})

const newAppointmentSchema = z.object({
  professionalId: z.string().uuid(),
  procedureId:    z.string().uuid(),
  scheduledDate:  z.string().date(),
  startTime:      z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/),
  notes:          z.string().max(1000).optional(),
})

const cancelSchema = z.object({
  reason: z.string().max(500).optional(),
})

const quickRatingSchema = z.object({
  quickRating: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE']),
  reasons:     z.array(z.string().max(100)).max(10).default([]),
})

// ──────────────────────────────────────────────────────────────────────────────

export const patientPortalRoutes: FastifyPluginAsync = async (app) => {

  app.addHook('preHandler', requirePatientAuth)

  // GET /profile
  app.get('/profile', async (request, reply) => {
    const prisma      = request.tenantPrisma!
    const patientId   = request.currentPatient.sub
    const patientRepo = new PrismaPatientRepository(prisma)
    const patient     = await patientRepo.findById(patientId)

    if (!patient || !patient.isActive) {
      return reply.status(401).send({ success: false, error: 'Paciente nao encontrado' })
    }

    // Busca pontos e tier — retorna defaults se não há registro ainda
    const loyalty = await new PrismaPointsRepository(prisma).getLoyaltyStats(patientId)

    return reply.status(200).send({
      success: true,
      data: {
        id:                      patient.id,
        name:                    patient.name,
        email:                   patient.email,
        phone:                   patient.phone,
        birthDate:               patient.birthDate,
        gender:                  patient.gender,
        city:                    patient.city,
        preferredContactChannel: patient.preferredContactChannel,
        loyalty,
      },
    })
  })

  // PATCH /profile
  app.patch('/profile', async (request, reply) => {
    const body = updateProfileSchema.parse(request.body)
    const patientRepo = new PrismaPatientRepository(request.tenantPrisma!)

    const patient = await patientRepo.update(request.currentPatient.sub, {
      ...(body.name      !== undefined ? { name: body.name }           : {}),
      ...(body.phone     !== undefined ? { phone: body.phone }         : {}),
      ...(body.email     !== undefined ? { email: body.email }         : {}),
      ...(body.birthDate !== undefined ? { birthDate: body.birthDate } : {}),
      ...(body.gender    !== undefined ? { gender: body.gender }       : {}),
      ...(body.city      !== undefined ? { city: body.city }           : {}),
    })

    return reply.status(200).send({
      success: true,
      data: {
        id:        patient.id,
        name:      patient.name,
        email:     patient.email,
        phone:     patient.phone,
        birthDate: patient.birthDate,
        gender:    patient.gender,
        city:      patient.city,
      },
    })
  })

  // GET /appointments
  app.get('/appointments', async (request, reply) => {
    const query = listAppointmentsSchema.parse(request.query)
    const today = new Date().toISOString().slice(0, 10)

    const result = await new ListAppointmentsUseCase(
      new PrismaAppointmentRepository(request.tenantPrisma!),
    ).execute({
      page:      query.page,
      limit:     query.limit,
      patientId: request.currentPatient.sub,
      ...(query.status   ? { status: query.status } : {}),
      ...(query.upcoming ? { startDate: today }      : {}),
    })

    return reply.status(200).send({ success: true, data: result })
  })

  // GET /appointments/:id
  app.get('/appointments/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const appointment = await new PrismaAppointmentRepository(request.tenantPrisma!).findById(id)

    if (!appointment) {
      return reply.status(404).send({ success: false, error: 'Agendamento nao encontrado' })
    }
    if (appointment.patientId !== request.currentPatient.sub) {
      return reply.status(403).send({ success: false, error: 'Acesso negado' })
    }

    return reply.status(200).send({ success: true, data: appointment })
  })

  // POST /appointments
  app.post('/appointments', async (request, reply) => {
    const body = newAppointmentSchema.parse(request.body)
    const prisma = request.tenantPrisma!

    const appointment = await new CreateAppointmentUseCase(
      new PrismaAppointmentRepository(prisma),
      new PrismaProfessionalRepository(prisma),
      new PrismaProcedureRepository(prisma),
      new PrismaPatientRepository(prisma),
      new PrismaWorkScheduleRepository(prisma),
    ).execute({
      patientId:      request.currentPatient.sub,
      professionalId: body.professionalId,
      procedureId:    body.procedureId,
      scheduledDate:  body.scheduledDate,
      startTime:      body.startTime,
      notes:          body.notes,
    })

    return reply.status(201).send({ success: true, data: appointment })
  })

  // POST /appointments/:id/cancel
  app.post('/appointments/:id/cancel', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = cancelSchema.parse(request.body)
    const prisma = request.tenantPrisma!

    const config = await new GetClinicPatientConfigUseCase(prisma).execute()

    const canceled = await new CancelAppointmentByPatientUseCase(
      new PrismaAppointmentRepository(prisma),
    ).execute({
      appointmentId: id,
      patientId:     request.currentPatient.sub,
      reason:        body.reason,
      config,
    })

    return reply.status(200).send({ success: true, data: canceled })
  })

  // POST /appointments/:id/quick-rating
  // M9 — Avaliacao Leve: emoji rapido para agendamentos COMPLETED. Upsert.
  app.post('/appointments/:id/quick-rating', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = quickRatingSchema.parse(request.body)
    const prisma = request.tenantPrisma!

    const result = await new SubmitQuickRatingUseCase(
      new PrismaAppointmentRepository(prisma),
      new PrismaAppointmentEvaluationRepository(prisma),
      new PrismaPointsRepository(prisma),
    ).execute({
      appointmentId: id,
      patientId:     request.currentPatient.sub,
      quickRating:   body.quickRating,
      reasons:       body.reasons,
    })

    return reply.status(200).send({ success: true, data: result })
  })
}
