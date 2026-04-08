import type { PrismaClient } from '@prisma/client'

import type {
  ISuperAdminRepository,
  SuperAdminUser,
} from '../../../domain/repositories/super-admin.repository.js'

// ─── Prisma Super Admin Repository ──────────────────────────────────────────
//
// Opera no schema `public` usando o prisma client global.
// ─────────────────────────────────────────────────────────────────────────────

export class PrismaSuperAdminRepository implements ISuperAdminRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<SuperAdminUser | null> {
    return this.prisma.superAdminUser.findUnique({
      where: { email },
    })
  }

  async findById(id: string): Promise<SuperAdminUser | null> {
    return this.prisma.superAdminUser.findUnique({
      where: { id },
    })
  }
}
