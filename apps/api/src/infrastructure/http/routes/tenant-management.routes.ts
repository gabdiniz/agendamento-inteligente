import type { FastifyPluginAsync } from 'fastify'
import { prisma, createTenantClient, createTenantSchema } from '@myagendix/database'
import {
  createTenantWithGestorSchema,
  updateTenantSchema,
  paginationSchema,
  uuidSchema,
} from '@myagendix/shared'
import { z } from 'zod'

import { CreateTenantUseCase } from '../../../application/use-cases/tenant-management/create-tenant.use-case.js'
import { ListTenantsUseCase } from '../../../application/use-cases/tenant-management/list-tenants.use-case.js'
import { GetTenantUseCase } from '../../../application/use-cases/tenant-management/get-tenant.use-case.js'
import { UpdateTenantUseCase } from '../../../application/use-cases/tenant-management/update-tenant.use-case.js'
import { ToggleTenantActiveUseCase } from '../../../application/use-cases/tenant-management/toggle-tenant-active.use-case.js'

import { PrismaTenantRepository } from '../../database/repositories/prisma-tenant.repository.js'
import { HashService } from '../../services/hash.service.js'

import { requireSuperAdmin } from '../middlewares/super-admin-auth.middleware.js'

// ─── Singletons ─────────────────────────────────────────────────────────────

const tenantRepo = new PrismaTenantRepository(prisma)
const hashService = new HashService()

// ─── Query Params Schema ────────────────────────────────────────────────────

const listTenantsQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
})

// ─── Tenant Management Routes ───────────────────────────────────────────────
//
// Registradas dentro do scope /super-admin/tenants/ (requireSuperAdmin).
//
// POST   /super-admin/tenants           → criar tenant + gestor
// GET    /super-admin/tenants           → listar tenants (paginado, filtros)
// GET    /super-admin/tenants/:id       → detalhes de um tenant
// PATCH  /super-admin/tenants/:id       → atualizar dados do tenant
// PATCH  /super-admin/tenants/:id/activate   → ativar tenant
// PATCH  /super-admin/tenants/:id/deactivate → desativar tenant
// ─────────────────────────────────────────────────────────────────────────────

export const tenantManagementRoutes: FastifyPluginAsync = async (app) => {
  // Todas as rotas deste plugin requerem super admin auth
  app.addHook('preHandler', requireSuperAdmin)

  // ─── POST / ───────────────────────────────────────────────
  app.post('/', async (request, reply) => {
    const body = createTenantWithGestorSchema.parse(request.body)

    const useCase = new CreateTenantUseCase(
      tenantRepo,
      hashService,
      createTenantSchema,
      createTenantClient,
    )

    const result = await useCase.execute({
      name: body.name,
      slug: body.slug,
      email: body.email,
      phone: body.phone,
      address: body.address,
      gestor: {
        name: body.gestor.name,
        email: body.gestor.email,
        password: body.gestor.password,
        phone: body.gestor.phone,
      },
    })

    return reply.status(201).send({
      success: true,
      data: result,
    })
  })

  // ─── GET / ────────────────────────────────────────────────
  app.get('/', async (request, reply) => {
    const query = listTenantsQuerySchema.parse(request.query)

    const useCase = new ListTenantsUseCase(tenantRepo)

    const result = await useCase.execute({
      page: query.page,
      limit: query.limit,
      search: query.search,
      isActive: query.isActive,
    })

    return reply.status(200).send({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    })
  })

  // ─── GET /:id ─────────────────────────────────────────────
  app.get('/:id', async (request, reply) => {
    const params = request.params as Record<string, string>
    const id = uuidSchema.parse(params['id'])

    const useCase = new GetTenantUseCase(tenantRepo)
    const tenant = await useCase.execute(id)

    return reply.status(200).send({
      success: true,
      data: tenant,
    })
  })

  // ─── PATCH /:id ───────────────────────────────────────────
  app.patch('/:id', async (request, reply) => {
    const params = request.params as Record<string, string>
    const id = uuidSchema.parse(params['id'])
    const body = updateTenantSchema.parse(request.body)

    const useCase = new UpdateTenantUseCase(tenantRepo)
    const tenant = await useCase.execute(id, body)

    return reply.status(200).send({
      success: true,
      data: tenant,
    })
  })

  // ─── PATCH /:id/activate ─────────────────────────────────
  app.patch('/:id/activate', async (request, reply) => {
    const params = request.params as Record<string, string>
    const id = uuidSchema.parse(params['id'])

    const useCase = new ToggleTenantActiveUseCase(tenantRepo)
    const tenant = await useCase.execute({ tenantId: id, isActive: true })

    return reply.status(200).send({
      success: true,
      data: tenant,
    })
  })

  // ─── PATCH /:id/deactivate ───────────────────────────────
  app.patch('/:id/deactivate', async (request, reply) => {
    const params = request.params as Record<string, string>
    const id = uuidSchema.parse(params['id'])

    const useCase = new ToggleTenantActiveUseCase(tenantRepo)
    const tenant = await useCase.execute({ tenantId: id, isActive: false })

    return reply.status(200).send({
      success: true,
      data: tenant,
    })
  })
}
