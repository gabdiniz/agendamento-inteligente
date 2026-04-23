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
  // 60 req/min — listagem pública, tolerância mais alta (usada no carregamento inicial)
  app.get('/professionals', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const prisma = request.tenantPrisma!

    // ── Query única — busca profissionais ativos com seus procedimentos ──
    // ATENÇÃO: NÃO usar `where: { procedure: { isActive: true } }` dentro do
    // select de procedures (relação explícita many-to-many via ProfessionalProcedure).
    // O filtro aninhado em relações explícitas causa erro interno no Prisma:
    // "Cannot read properties of undefined (reading 'professional')".
    // Solução: buscar todos os procedimentos com isActive e filtrar em JS.
    const rows = await prisma.professional.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        specialty: true,
        bio: true,
        avatarUrl: true,
        color: true,
        procedures: {
          select: {
            procedure: {
              select: { id: true, name: true, durationMinutes: true, color: true, isActive: true },
            },
          },
        },
      },
    })

    const professionals = rows
      .map((prof) => ({
        id: prof.id,
        name: prof.name,
        specialty: prof.specialty,
        bio: prof.bio,
        avatarUrl: prof.avatarUrl,
        color: prof.color,
        // Filtra em JS: só procedures ativas e com dados válidos
        procedures: prof.procedures
          .filter((pp) => pp.procedure != null && pp.procedure.isActive)
          .map((pp) => ({
            id: pp.procedure.id,
            name: pp.procedure.name,
            durationMinutes: pp.procedure.durationMinutes,
            color: pp.procedure.color,
          })),
      }))
      // Exclui profissionais sem procedimento ativo vinculado
      .filter((p) => p.procedures.length > 0)

    return reply.status(200).send({ success: true, data: professionals })
  })

  // ─── GET /slots ───────────────────────────────────────────────
  //
  // ?professionalId=uuid&procedureId=uuid&date=YYYY-MM-DD
  // Retorna lista de { startTime, endTime } disponíveis.
  //
  // 30 req/min — busca de slots disponíveis (pode ser chamada repetidamente ao navegar por datas)
  app.get('/slots', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (request, reply) => {
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
  // 5 agendamentos/min por IP — previne criação em massa de agendamentos falsos
  app.post('/book', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
        errorResponseBuilder: () => ({
          success: false,
          error: 'Muitas tentativas de agendamento. Aguarde um momento e tente novamente.',
        }),
      },
    },
  }, async (request, reply) => {
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
  // 5 entradas/min por IP
  app.post('/waitlist', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
        errorResponseBuilder: () => ({
          success: false,
          error: 'Muitas solicitações. Aguarde um momento e tente novamente.',
        }),
      },
    },
  }, async (request, reply) => {
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
