import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  publicBookingSchema,
  createWaitlistEntrySchema,
} from '@myagendix/shared'

import { GetAvailableSlotsUseCase } from '../../../application/use-cases/public-booking/get-available-slots.use-case.js'
import { CreateAppointmentUseCase } from '../../../application/use-cases/appointment/create-appointment.use-case.js'
import { AddToWaitlistUseCase } from '../../../application/use-cases/waitlist/add-to-waitlist.use-case.js'

import { PrismaProfessionalRepository } from '../../database/repositories/prisma-professional.repository.js'
import { PrismaProcedureRepository } from '../../database/repositories/prisma-procedure.repository.js'
import { PrismaWorkScheduleRepository } from '../../database/repositories/prisma-work-schedule.repository.js'
import { PrismaAppointmentRepository } from '../../database/repositories/prisma-appointment.repository.js'
import { PrismaPatientRepository } from '../../database/repositories/prisma-patient.repository.js'
import { PrismaWaitlistRepository } from '../../database/repositories/prisma-waitlist.repository.js'

// ─── Public Booking Routes ────────────────────────────────────────────────────
//
// Rotas públicas — sem autenticação.
// Destinadas à página de agendamento acessível pelo paciente.
//
// GET  /t/:slug/public/professionals            → lista profissionais + procedimentos
// GET  /t/:slug/public/slots                    → horários disponíveis
// POST /t/:slug/public/book                     → reserva um horário
// POST /t/:slug/public/waitlist                 → entra na lista de espera
// ─────────────────────────────────────────────────────────────────────────────

const slotsQuerySchema = z.object({
  professionalId: z.string().uuid(),
  procedureId: z.string().uuid(),
  date: z.string().date(),
})

export const publicBookingRoutes: FastifyPluginAsync = async (app) => {
  // ─── GET /professionals ───────────────────────────────────────
  //
  // Lista todos os profissionais ativos com seus procedimentos ativos.
  // Usado para popular os selects da página pública.
  //
  app.get('/professionals', async (request, reply) => {
    const prisma = request.tenantPrisma!
    const repo = new PrismaProfessionalRepository(prisma)
    const procedureRepo = new PrismaProcedureRepository(prisma)

    // Busca todos os profissionais ativos (sem paginação — página pública exibe todos)
    const result = await repo.list({ page: 1, limit: 200, isActive: true })

    // Para cada profissional, filtra apenas procedimentos ativos
    const professionals = await Promise.all(
      result.data.map(async (prof) => {
        // Os procedimentos já vêm no ProfessionalWithProcedures; filtramos ativos
        const activeProcedures: typeof prof.procedures = []
        for (const proc of prof.procedures) {
          const full = await procedureRepo.findById(proc.id)
          if (full?.isActive) activeProcedures.push(proc)
        }
        return {
          id: prof.id,
          name: prof.name,
          specialty: prof.specialty,
          bio: prof.bio,
          avatarUrl: prof.avatarUrl,
          color: prof.color,
          procedures: activeProcedures,
        }
      }),
    )

    // Exclui profissionais sem nenhum procedimento ativo
    const withProcedures = professionals.filter((p) => p.procedures.length > 0)

    return reply.status(200).send({ success: true, data: withProcedures })
  })

  // ─── GET /slots ───────────────────────────────────────────────
  //
  // ?professionalId=uuid&procedureId=uuid&date=YYYY-MM-DD
  // Retorna lista de { startTime, endTime } disponíveis.
  //
  app.get('/slots', async (request, reply) => {
    const query = slotsQuerySchema.parse(request.query)
    const prisma = request.tenantPrisma!

    const result = await new GetAvailableSlotsUseCase(
      new PrismaProfessionalRepository(prisma),
      new PrismaProcedureRepository(prisma),
      new PrismaWorkScheduleRepository(prisma),
      new PrismaAppointmentRepository(prisma),
    ).execute({
      professionalId: query.professionalId,
      procedureId: query.procedureId,
      date: query.date,
    })

    return reply.status(200).send({ success: true, data: result })
  })

  // ─── POST /book ───────────────────────────────────────────────
  //
  // Reserva um horário diretamente.
  // Usa o mesmo CreateAppointmentUseCase do painel interno,
  // com find-or-create de paciente embutido.
  //
  app.post('/book', async (request, reply) => {
    const body = publicBookingSchema.parse(request.body)
    const prisma = request.tenantPrisma!

    // ── Find-or-create paciente ────────────────────────────────
    const patientRepo = new PrismaPatientRepository(prisma)
    let patient = await patientRepo.findByPhone(body.patientPhone)
    if (!patient) {
      patient = await patientRepo.create({
        name: body.patientName,
        phone: body.patientPhone,
        source: 'PUBLIC_PAGE',
        ...(body.patientEmail !== undefined ? { email: body.patientEmail } : {}),
      })
    }

    // ── Criar agendamento ──────────────────────────────────────
    const appointment = await new CreateAppointmentUseCase(
      new PrismaAppointmentRepository(prisma),
      new PrismaProfessionalRepository(prisma),
      new PrismaProcedureRepository(prisma),
      new PrismaPatientRepository(prisma),
      new PrismaWorkScheduleRepository(prisma),
    ).execute({
      patientId: patient.id,
      professionalId: body.professionalId,
      procedureId: body.procedureId,
      scheduledDate: body.scheduledDate,
      startTime: body.startTime,
    })

    return reply.status(201).send({ success: true, data: appointment })
  })

  // ─── POST /waitlist ───────────────────────────────────────────
  //
  // Paciente entra na lista de espera quando não encontra horário.
  // Reutiliza o AddToWaitlistUseCase existente.
  //
  app.post('/waitlist', async (request, reply) => {
    const body = createWaitlistEntrySchema.parse(request.body)
    const prisma = request.tenantPrisma!

    const entry = await new AddToWaitlistUseCase(
      new PrismaWaitlistRepository(prisma),
      new PrismaPatientRepository(prisma),
      new PrismaProcedureRepository(prisma),
      new PrismaProfessionalRepository(prisma),
    ).execute({
      patientPhone: body.patientPhone,
      patientName: body.patientName,
      procedureId: body.procedureId,
      minAdvanceMinutes: body.minAdvanceMinutes,
      ...(body.professionalId !== undefined ? { professionalId: body.professionalId } : {}),
      ...(body.preferredDateFrom !== undefined ? { preferredDateFrom: body.preferredDateFrom } : {}),
      ...(body.preferredDateTo !== undefined ? { preferredDateTo: body.preferredDateTo } : {}),
    })

    return reply.status(201).send({ success: true, data: entry })
  })
}
