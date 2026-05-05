import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { createPatientSchema, updatePatientSchema, paginationSchema, uuidSchema } from '@myagendix/shared'

import { CreatePatientUseCase } from '../../../application/use-cases/patient/create-patient.use-case.js'
import { ListPatientsUseCase } from '../../../application/use-cases/patient/list-patients.use-case.js'
import { GetPatientUseCase } from '../../../application/use-cases/patient/get-patient.use-case.js'
import { UpdatePatientUseCase } from '../../../application/use-cases/patient/update-patient.use-case.js'
import { TogglePatientActiveUseCase } from '../../../application/use-cases/patient/toggle-patient-active.use-case.js'
import { SendPatientInviteUseCase } from '../../../application/use-cases/patient/send-patient-invite.use-case.js'
import { PrismaPatientRepository } from '../../database/repositories/prisma-patient.repository.js'
import { requireAuth, requireRoles } from '../middlewares/auth.middleware.js'

// ─── Patient Routes ───────────────────────────────────────────────────────────
//
// GET    /t/:slug/patients                   → listar (requireAuth)
// GET    /t/:slug/patients/:id               → buscar (requireAuth)
// POST   /t/:slug/patients                   → criar (GESTOR | RECEPCAO)
// PATCH  /t/:slug/patients/:id               → editar (GESTOR | RECEPCAO)
// PATCH  /t/:slug/patients/:id/activate      → ativar (GESTOR)
// PATCH  /t/:slug/patients/:id/deactivate    → desativar (GESTOR)
// POST   /t/:slug/patients/:id/send-invite   → enviar convite (GESTOR | RECEPCAO)
// ─────────────────────────────────────────────────────────────────────────────

const listQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
})

export const patientRoutes: FastifyPluginAsync = async (app) => {
  // ─── GET / ────────────────────────────────────────────────
  app.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const query = listQuerySchema.parse(request.query)
    const repo = new PrismaPatientRepository(request.tenantPrisma!)

    const result = await new ListPatientsUseCase(repo).execute(query)

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
    const repo = new PrismaPatientRepository(request.tenantPrisma!)

    const patient = await new GetPatientUseCase(repo).execute(id)

    return reply.status(200).send({ success: true, data: patient })
  })

  // ─── POST / ───────────────────────────────────────────────
  app.post('/', { preHandler: [requireAuth, requireRoles('GESTOR', 'RECEPCAO')] }, async (request, reply) => {
    const body = createPatientSchema.parse(request.body)
    const repo = new PrismaPatientRepository(request.tenantPrisma!)

    const patient = await new CreatePatientUseCase(repo).execute(body)

    return reply.status(201).send({ success: true, data: patient })
  })

  // ─── PATCH /:id ───────────────────────────────────────────
  app.patch('/:id', { preHandler: [requireAuth, requireRoles('GESTOR', 'RECEPCAO')] }, async (request, reply) => {
    const params = request.params as Record<string, string>
    const id = uuidSchema.parse(params['id'])
    const body = updatePatientSchema.parse(request.body)
    const repo = new PrismaPatientRepository(request.tenantPrisma!)

    const patient = await new UpdatePatientUseCase(repo).execute({ patientId: id, ...body })

    return reply.status(200).send({ success: true, data: patient })
  })

  // ─── PATCH /:id/activate ──────────────────────────────────
  app.patch('/:id/activate', { preHandler: [requireAuth, requireRoles('GESTOR')] }, async (request, reply) => {
    const params = request.params as Record<string, string>
    const id = uuidSchema.parse(params['id'])
    const repo = new PrismaPatientRepository(request.tenantPrisma!)

    const patient = await new TogglePatientActiveUseCase(repo).execute(id, true)

    return reply.status(200).send({ success: true, data: patient })
  })

  // ─── PATCH /:id/deactivate ────────────────────────────────
  app.patch('/:id/deactivate', { preHandler: [requireAuth, requireRoles('GESTOR')] }, async (request, reply) => {
    const params = request.params as Record<string, string>
    const id = uuidSchema.parse(params['id'])
    const repo = new PrismaPatientRepository(request.tenantPrisma!)

    const patient = await new TogglePatientActiveUseCase(repo).execute(id, false)

    return reply.status(200).send({ success: true, data: patient })
  })

  // ─── POST /:id/send-invite ────────────────────────────────
  //
  // Envia convite de acesso ao portal do paciente via WhatsApp ou Email.
  // O frontend passa o inviteLink construído com window.location.origin + '/' + slug,
  // garantindo que funcione tanto em dev quanto em produção.
  //
  const sendInviteBodySchema = z.object({
    channel:    z.enum(['WHATSAPP', 'EMAIL']),
    inviteLink: z.string().url('inviteLink deve ser uma URL válida'),
    message:    z.string().min(10).max(2000).optional(),
  })

  app.post('/:id/send-invite', { preHandler: [requireAuth, requireRoles('GESTOR', 'RECEPCAO')] }, async (request, reply) => {
    const params = request.params as Record<string, string>
    const id     = uuidSchema.parse(params['id'])
    const body   = sendInviteBodySchema.parse(request.body)

    const result = await new SendPatientInviteUseCase(request.tenantPrisma!).execute({
      patientId:  id,
      tenantId:   request.tenantId!,
      channel:    body.channel,
      inviteLink: body.inviteLink,
      message:    body.message,
    })

    return reply.status(200).send({ success: true, data: result })
  })
}
