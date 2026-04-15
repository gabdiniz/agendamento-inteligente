import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { createProcedureSchema, updateProcedureSchema, paginationSchema, uuidSchema } from '@myagendix/shared'

import { CreateProcedureUseCase } from '../../../application/use-cases/procedure/create-procedure.use-case.js'
import { ListProceduresUseCase } from '../../../application/use-cases/procedure/list-procedures.use-case.js'
import { GetProcedureUseCase } from '../../../application/use-cases/procedure/get-procedure.use-case.js'
import { UpdateProcedureUseCase } from '../../../application/use-cases/procedure/update-procedure.use-case.js'
import { ToggleProcedureActiveUseCase } from '../../../application/use-cases/procedure/toggle-procedure-active.use-case.js'
import { PrismaProcedureRepository } from '../../database/repositories/prisma-procedure.repository.js'
import { requireAuth, requireRoles } from '../middlewares/auth.middleware.js'

const listQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
})

// ─── Procedure Routes ─────────────────────────────────────────────────────────
//
// GET    /t/:slug/procedures                   → todos (requireAuth)
// GET    /t/:slug/procedures/:id               → um (requireAuth)
// POST   /t/:slug/procedures                   → criar (GESTOR)
// PATCH  /t/:slug/procedures/:id               → editar (GESTOR)
// PATCH  /t/:slug/procedures/:id/activate      → ativar (GESTOR)
// PATCH  /t/:slug/procedures/:id/deactivate    → desativar (GESTOR)
// DELETE /t/:slug/procedures/:id               → excluir (GESTOR)
// ─────────────────────────────────────────────────────────────────────────────

export const procedureRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', { preHandler: [requireAuth] }, async (request, reply) => {
    const query = listQuerySchema.parse(request.query)
    const repo = new PrismaProcedureRepository(request.tenantPrisma!)
    const result = await new ListProceduresUseCase(repo).execute(query)
    return reply.status(200).send({
      success: true,
      data: result.data,
      meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages },
    })
  })

  app.get('/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as Record<string, string>
    const id = uuidSchema.parse(params['id'])
    const repo = new PrismaProcedureRepository(request.tenantPrisma!)
    const procedure = await new GetProcedureUseCase(repo).execute(id)
    return reply.status(200).send({ success: true, data: procedure })
  })

  app.post('/', { preHandler: [requireAuth, requireRoles('GESTOR')] }, async (request, reply) => {
    const body = createProcedureSchema.parse(request.body)
    const repo = new PrismaProcedureRepository(request.tenantPrisma!)
    const procedure = await new CreateProcedureUseCase(repo).execute(body)
    return reply.status(201).send({ success: true, data: procedure })
  })

  app.patch('/:id', { preHandler: [requireAuth, requireRoles('GESTOR')] }, async (request, reply) => {
    const params = request.params as Record<string, string>
    const id = uuidSchema.parse(params['id'])
    const body = updateProcedureSchema.parse(request.body)
    const repo = new PrismaProcedureRepository(request.tenantPrisma!)
    const procedure = await new UpdateProcedureUseCase(repo).execute({ procedureId: id, ...body })
    return reply.status(200).send({ success: true, data: procedure })
  })

  app.patch('/:id/activate', { preHandler: [requireAuth, requireRoles('GESTOR')] }, async (request, reply) => {
    const params = request.params as Record<string, string>
    const id = uuidSchema.parse(params['id'])
    const repo = new PrismaProcedureRepository(request.tenantPrisma!)
    const procedure = await new ToggleProcedureActiveUseCase(repo).execute(id, true)
    return reply.status(200).send({ success: true, data: procedure })
  })

  app.patch('/:id/deactivate', { preHandler: [requireAuth, requireRoles('GESTOR')] }, async (request, reply) => {
    const params = request.params as Record<string, string>
    const id = uuidSchema.parse(params['id'])
    const repo = new PrismaProcedureRepository(request.tenantPrisma!)
    const procedure = await new ToggleProcedureActiveUseCase(repo).execute(id, false)
    return reply.status(200).send({ success: true, data: procedure })
  })

  app.delete('/:id', { preHandler: [requireAuth, requireRoles('GESTOR')] }, async (request, reply) => {
    const params = request.params as Record<string, string>
    const id = uuidSchema.parse(params['id'])
    const repo = new PrismaProcedureRepository(request.tenantPrisma!)
    const procedure = await repo.findById(id)
    if (!procedure) return reply.status(404).send({ success: false, error: 'Procedimento não encontrado' })
    await repo.delete(id)
    return reply.status(204).send()
  })
}
