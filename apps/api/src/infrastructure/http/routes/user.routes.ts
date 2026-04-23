import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { createUserSchema, updateUserSchema, paginationSchema, uuidSchema } from '@myagendix/shared'

import { ListUsersUseCase }         from '../../../application/use-cases/user/list-users.use-case.js'
import { GetUserUseCase }           from '../../../application/use-cases/user/get-user.use-case.js'
import { CreateUserUseCase }        from '../../../application/use-cases/user/create-user.use-case.js'
import { UpdateUserUseCase }        from '../../../application/use-cases/user/update-user.use-case.js'
import { ToggleUserActiveUseCase }  from '../../../application/use-cases/user/toggle-user-active.use-case.js'
import { PrismaUserRepository }     from '../../database/repositories/prisma-user.repository.js'
import { requireAuth, requireRoles } from '../middlewares/auth.middleware.js'

// ─── User Routes ──────────────────────────────────────────────────────────────
//
// GET    /t/:slug/users              → listar (GESTOR)
// GET    /t/:slug/users/:id          → buscar (GESTOR)
// POST   /t/:slug/users              → criar  (GESTOR)
// PATCH  /t/:slug/users/:id          → editar (GESTOR)
// PATCH  /t/:slug/users/:id/activate   → ativar   (GESTOR)
// PATCH  /t/:slug/users/:id/deactivate → desativar (GESTOR)
// ─────────────────────────────────────────────────────────────────────────────

const listQuerySchema = paginationSchema.extend({
  search:   z.string().optional(),
  isActive: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
})

export const userRoutes: FastifyPluginAsync = async (app) => {
  // Todas as rotas de usuário exigem GESTOR
  const gestorGuard = [requireAuth, requireRoles('GESTOR')]

  // ─── GET / ────────────────────────────────────────────────
  app.get('/', { preHandler: gestorGuard }, async (request, reply) => {
    const query = listQuerySchema.parse(request.query)
    const repo  = new PrismaUserRepository(request.tenantPrisma!)

    const result = await new ListUsersUseCase(repo).execute(query)

    return reply.status(200).send({
      success: true,
      data:    result.data,
      meta:    { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages },
    })
  })

  // ─── GET /:id ─────────────────────────────────────────────
  app.get('/:id', { preHandler: gestorGuard }, async (request, reply) => {
    const params = request.params as Record<string, string>
    const id     = uuidSchema.parse(params['id'])
    const repo   = new PrismaUserRepository(request.tenantPrisma!)

    const user = await new GetUserUseCase(repo).execute(id)

    return reply.status(200).send({ success: true, data: user })
  })

  // ─── POST / ───────────────────────────────────────────────
  app.post('/', { preHandler: gestorGuard }, async (request, reply) => {
    const body = createUserSchema.parse(request.body)
    const repo = new PrismaUserRepository(request.tenantPrisma!)

    const user = await new CreateUserUseCase(repo).execute(body)

    return reply.status(201).send({ success: true, data: user })
  })

  // ─── PATCH /:id ───────────────────────────────────────────
  app.patch('/:id', { preHandler: gestorGuard }, async (request, reply) => {
    const params = request.params as Record<string, string>
    const id     = uuidSchema.parse(params['id'])
    const body   = updateUserSchema.parse(request.body)
    const repo   = new PrismaUserRepository(request.tenantPrisma!)

    const user = await new UpdateUserUseCase(repo).execute(id, body)

    return reply.status(200).send({ success: true, data: user })
  })

  // ─── PATCH /:id/activate ──────────────────────────────────
  app.patch('/:id/activate', { preHandler: gestorGuard }, async (request, reply) => {
    const params = request.params as Record<string, string>
    const id     = uuidSchema.parse(params['id'])
    const repo   = new PrismaUserRepository(request.tenantPrisma!)

    const user = await new ToggleUserActiveUseCase(repo).execute(id, true)

    return reply.status(200).send({ success: true, data: user })
  })

  // ─── PATCH /:id/deactivate ────────────────────────────────
  app.patch('/:id/deactivate', { preHandler: gestorGuard }, async (request, reply) => {
    const params = request.params as Record<string, string>
    const id     = uuidSchema.parse(params['id'])
    const repo   = new PrismaUserRepository(request.tenantPrisma!)

    const user = await new ToggleUserActiveUseCase(repo).execute(id, false)

    return reply.status(200).send({ success: true, data: user })
  })
}
