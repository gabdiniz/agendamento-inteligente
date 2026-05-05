import { PrismaClient } from '@prisma/client'

export { prisma } from './prisma-client.js'

// ─── Tenant-aware Prisma Client ────────────────────────────────────────────
//
// Em ambiente multi-tenant (schema-per-tenant), o client deve ser instanciado
// com o schema correto para cada request. Use `createTenantClient` em vez do
// client global para operações de tenant.
//
// O client global (`prisma`) é usado apenas para operações no schema `public`
// (tenants, super_admin_users, plans, subscriptions, etc.)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Cria um PrismaClient apontando para o schema do tenant informado.
 * Deve ser chamado por request e descartado após uso.
 */
export function createTenantClient(tenantSchema: string): PrismaClient {
  const url = new URL(process.env['DATABASE_URL'] ?? '')
  url.searchParams.set('schema', tenantSchema)

  return new PrismaClient({
    datasources: { db: { url: url.toString() } },
    log: process.env['NODE_ENV'] === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export { PrismaClient }
export * from '@prisma/client'
export { createTenantSchema } from './create-tenant-schema.js'
