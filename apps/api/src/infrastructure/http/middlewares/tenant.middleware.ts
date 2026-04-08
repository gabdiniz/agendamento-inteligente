import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { prisma, createTenantClient, type PrismaClient } from '@myagendix/database'

import { NotFoundError } from '../../../domain/errors/app-error.js'

// ─── Augment Fastify types ────────────────────────────────────────────────

declare module 'fastify' {
  interface FastifyRequest {
    tenantId: string
    tenantSchema: string
    tenantSlug: string
    tenantPrisma: PrismaClient | null
  }
}

// ─── Tenant Plugin ───────────────────────────────────────────────────────
//
// Resolve o tenant a partir do :slug na URL.
// Registrado DENTRO do scope /t/:slug/ (encapsulado — não usa fp()).
//
// Após este hook, o request terá:
//   - tenantId: UUID do tenant
//   - tenantSlug: slug original (com hífens)
//   - tenantSchema: nome do schema no PostgreSQL (ex: tenant_clinica_abc)
//   - tenantPrisma: PrismaClient apontando para o schema do tenant
//
// O tenantPrisma é descartado (disconnect) ao finalizar o response.
// ─────────────────────────────────────────────────────────────────────────

const tenantPlugin: FastifyPluginAsync = async (fastify) => {
  // Decora o request com valores iniciais (Fastify exige isso)
  fastify.decorateRequest('tenantId', '')
  fastify.decorateRequest('tenantSchema', '')
  fastify.decorateRequest('tenantSlug', '')
  fastify.decorateRequest('tenantPrisma', null)

  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    const params = request.params as Record<string, string>
    const slug = params['slug']

    if (!slug) {
      throw new NotFoundError('Tenant')
    }

    // Busca o tenant no schema public
    const tenant = await prisma.tenant.findUnique({
      where: { slug, isActive: true },
      select: { id: true, slug: true },
    })

    if (!tenant) {
      throw new NotFoundError('Clínica não encontrada ou inativa')
    }

    // Injeta no request
    request.tenantId = tenant.id
    request.tenantSlug = tenant.slug
    request.tenantSchema = `tenant_${tenant.slug.replace(/-/g, '_')}`
    request.tenantPrisma = createTenantClient(request.tenantSchema)
  })

  // Descarta o client do tenant ao finalizar o request
  fastify.addHook('onResponse', async (request) => {
    if (request.tenantPrisma) {
      await request.tenantPrisma.$disconnect()
    }
  })
}

export default tenantPlugin
export { tenantPlugin }
