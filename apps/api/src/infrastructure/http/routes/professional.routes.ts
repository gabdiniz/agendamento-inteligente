import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  createProfessionalSchema,
  updateProfessionalSchema,
  paginationSchema,
  uuidSchema,
} from '@myagendix/shared'

import { CreateProfessionalUseCase } from '../../../application/use-cases/professional/create-professional.use-case.js'
import { ListProfessionalsUseCase } from '../../../application/use-cases/professional/list-professionals.use-case.js'
import { GetProfessionalUseCase } from '../../../application/use-cases/professional/get-professional.use-case.js'
import { UpdateProfessionalUseCase } from '../../../application/use-cases/professional/update-professional.use-case.js'
import { ToggleProfessionalActiveUseCase } from '../../../application/use-cases/professional/toggle-professional-active.use-case.js'
import { LinkProceduresUseCase, UnlinkProcedureUseCase } from '../../../application/use-cases/professional/manage-professional-procedures.use-case.js'

import { PrismaProfessionalRepository } from '../../database/repositories/prisma-professional.repository.js'

import { requireAuth } from '../middlewares/auth.middleware.js'
import { requireRoles } from '../middlewares/auth.middleware.js'

// ─── Query/Body schemas locais ───────────────────────────────────────────────

const listQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
})

const linkProceduresBodySchema = z.object({
  procedureIds: z.array(uuidSchema).min(1),
})

// ─── Professional Routes ─────────────────────────────────────────────────────
//
// GET    /t/:slug/professionals              → todos (requireAuth)
// GET    /t/:slug/professionals/:id          → um (requireAuth)
// POST   /t/:slug/professionals              → criar (GESTOR)
// PATCH  /t/:slug/professionals/:id          → editar (GESTOR)
// PATCH  /t/:slug/professionals/:id/activate   → ativar (GESTOR)
// PATCH  /t/:slug/professionals/:id/deactivate → desativar (GESTOR)
// POST   /t/:slug/professionals/:id/procedures → linkar procedures (GESTOR)
// DELETE /t/:slug/professionals/:id/procedures/:procedureId → deslinkar (GESTOR)
// ─────────────────────────────────────────────────────────────────────────────

export const professionalRoutes: FastifyPluginAsync = async (app) => {
  // ─── GET / ────────────────────────────────────────────────
  app.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const query = listQuerySchema.parse(request.query)
    const repo = new PrismaProfessionalRepository(request.tenantPrisma!)

    const result = await new ListProfessionalsUseCase(repo).execute(query)

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
    const repo = new PrismaProfessionalRepository(request.tenantPrisma!)

    const professional = await new GetProfessionalUseCase(repo).execute(id)

    return reply.status(200).send({ success: true, data: professional })
  })

  // ─── POST / ───────────────────────────────────────────────
  app.post('/', { preHandler: [requireAuth, requireRoles('GESTOR')] }, async (request, reply) => {
    const body = createProfessionalSchema.parse(request.body)
    const repo = new PrismaProfessionalRepository(request.tenantPrisma!)

    const professional = await new CreateProfessionalUseCase(repo).execute(body)

    return reply.status(201).send({ success: true, data: professional })
  })

  // ─── PATCH /:id ───────────────────────────────────────────
  app.patch('/:id', { preHandler: [requireAuth, requireRoles('GESTOR')] }, async (request, reply) => {
    const params = request.params as Record<string, string>
    const id = uuidSchema.parse(params['id'])
    const body = updateProfessionalSchema.parse(request.body)
    const repo = new PrismaProfessionalRepository(request.tenantPrisma!)

    const professional = await new UpdateProfessionalUseCase(repo).execute({
      professionalId: id,
      ...body,
    })

    return reply.status(200).send({ success: true, data: professional })
  })

  // ─── PATCH /:id/activate ─────────────────────────────────
  app.patch('/:id/activate', { preHandler: [requireAuth, requireRoles('GESTOR')] }, async (request, reply) => {
    const params = request.params as Record<string, string>
    const id = uuidSchema.parse(params['id'])
    const repo = new PrismaProfessionalRepository(request.tenantPrisma!)

    const professional = await new ToggleProfessionalActiveUseCase(repo).execute({
      professionalId: id,
      isActive: true,
    })

    return reply.status(200).send({ success: true, data: professional })
  })

  // ─── PATCH /:id/deactivate ───────────────────────────────
  app.patch('/:id/deactivate', { preHandler: [requireAuth, requireRoles('GESTOR')] }, async (request, reply) => {
    const params = request.params as Record<string, string>
    const id = uuidSchema.parse(params['id'])
    const repo = new PrismaProfessionalRepository(request.tenantPrisma!)

    const professional = await new ToggleProfessionalActiveUseCase(repo).execute({
      professionalId: id,
      isActive: false,
    })

    return reply.status(200).send({ success: true, data: professional })
  })

  // ─── POST /:id/procedures ─────────────────────────────────
  app.post('/:id/procedures', { preHandler: [requireAuth, requireRoles('GESTOR')] }, async (request, reply) => {
    const params = request.params as Record<string, string>
    const id = uuidSchema.parse(params['id'])
    const body = linkProceduresBodySchema.parse(request.body)
    const repo = new PrismaProfessionalRepository(request.tenantPrisma!)

    await new LinkProceduresUseCase(repo).execute({
      professionalId: id,
      procedureIds: body.procedureIds,
    })

    return reply.status(200).send({ success: true, message: 'Procedimentos vinculados com sucesso' })
  })

  // ─── DELETE /:id/procedures/:procedureId ─────────────────
  app.delete('/:id/procedures/:procedureId', { preHandler: [requireAuth, requireRoles('GESTOR')] }, async (request, reply) => {
    const params = request.params as Record<string, string>
    const id = uuidSchema.parse(params['id'])
    const procedureId = uuidSchema.parse(params['procedureId'])
    const repo = new PrismaProfessionalRepository(request.tenantPrisma!)

    await new UnlinkProcedureUseCase(repo).execute({
      professionalId: id,
      procedureId,
    })

    return reply.status(200).send({ success: true, message: 'Procedimento desvinculado' })
  })
}
