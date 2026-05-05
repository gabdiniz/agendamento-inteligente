import { PrismaClient } from '@prisma/client'

// ─── Prisma Singleton (schema public) ────────────────────────────────────────
//
// Exportado de um arquivo separado para evitar dependências circulares:
//   index.ts re-exporta create-tenant-schema.ts
//   create-tenant-schema.ts precisa do prisma singleton
//   → ambos importam daqui, sem ciclo
// ─────────────────────────────────────────────────────────────────────────────

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma
}
