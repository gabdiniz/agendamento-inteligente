import type { PrismaClient } from '@prisma/client'

import type {
  ISuperAdminRefreshTokenRepository,
  StoredSuperAdminRefreshToken,
} from '../../../domain/repositories/super-admin-refresh-token.repository.js'

// ─── Prisma Super Admin Refresh Token Repository ────────────────────────────
//
// Opera no schema `public`. Usa a tabela super_admin_refresh_tokens.
// ─────────────────────────────────────────────────────────────────────────────

export class PrismaSuperAdminRefreshTokenRepository
  implements ISuperAdminRefreshTokenRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: {
    userId: string
    tokenHash: string
    expiresAt: Date
  }): Promise<StoredSuperAdminRefreshToken> {
    return this.prisma.superAdminRefreshToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    })
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<StoredSuperAdminRefreshToken | null> {
    return this.prisma.superAdminRefreshToken.findUnique({
      where: { tokenHash },
    })
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.superAdminRefreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    })
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.prisma.superAdminRefreshToken.updateMany({
      where: {
        userId,
        revokedAt: null, // só revoga os que ainda estão ativos
      },
      data: { revokedAt: new Date() },
    })
  }
}
