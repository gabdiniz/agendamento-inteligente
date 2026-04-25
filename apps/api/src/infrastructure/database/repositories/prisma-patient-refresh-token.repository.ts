import type { PrismaClient } from '@myagendix/database'

import type {
  IPatientRefreshTokenRepository,
  StoredPatientRefreshToken,
} from '../../../domain/repositories/patient-refresh-token.repository.js'

export class PrismaPatientRefreshTokenRepository implements IPatientRefreshTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: {
    patientId: string
    tokenHash: string
    expiresAt: Date
  }): Promise<StoredPatientRefreshToken> {
    return this.prisma.patientRefreshToken.create({
      data: {
        patientId: data.patientId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    })
  }

  async findByTokenHash(tokenHash: string): Promise<StoredPatientRefreshToken | null> {
    return this.prisma.patientRefreshToken.findUnique({
      where: { tokenHash },
    })
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.patientRefreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    })
  }

  async revokeAllByPatientId(patientId: string): Promise<void> {
    await this.prisma.patientRefreshToken.updateMany({
      where: { patientId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }
}
