// ─── PrismaPointsRepository ───────────────────────────────────────────────────
//
// Implementação Prisma do IPointsRepository.
// Opera no schema do tenant via tenantPrisma.
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient } from '@prisma/client'
import type {
  IPointsRepository,
  AwardPointsData,
  PatientLoyaltyStats,
  PatientTier,
  PointsTransactionRecord,
} from '../../../domain/repositories/points.repository.js'

// ─── Thresholds de tier ───────────────────────────────────────────────────────

const TIER_THRESHOLDS: Record<PatientTier, number> = {
  GOLD:   400,
  SILVER: 150,
  BRONZE: 0,
}

function computeTier(lifetimePoints: number): PatientTier {
  if (lifetimePoints >= TIER_THRESHOLDS.GOLD)   return 'GOLD'
  if (lifetimePoints >= TIER_THRESHOLDS.SILVER)  return 'SILVER'
  return 'BRONZE'
}

// ─────────────────────────────────────────────────────────────────────────────

export class PrismaPointsRepository implements IPointsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async countCompletedAppointments(patientId: string): Promise<number> {
    return this.prisma.appointment.count({
      where: { patientId, status: 'COMPLETED' },
    })
  }

  async hasRatingPoints(patientId: string, appointmentId: string): Promise<boolean> {
    const existing = await this.prisma.pointsTransaction.findFirst({
      where: {
        patientId,
        appointmentId,
        reason: 'QUICK_RATING_SUBMITTED',
      },
      select: { id: true },
    })
    return existing !== null
  }

  async award(data: AwardPointsData): Promise<PointsTransactionRecord> {
    const { patientId, reason, points, appointmentId } = data

    // Upsert CrmMetrics + cria transação em paralelo via $transaction
    const [tx] = await this.prisma.$transaction(async (trx) => {
      // 1. Upsert PatientCrmMetrics — garante que o registro existe
      const metrics = await trx.patientCrmMetrics.upsert({
        where:  { patientId },
        create: {
          patientId,
          loyaltyPoints:  Math.max(0, points),
          lifetimePoints: Math.max(0, points),
          classification: computeTier(Math.max(0, points)) as never,
        },
        update: {
          loyaltyPoints:  { increment: points },
          lifetimePoints: points > 0 ? { increment: points } : undefined,
        },
        select: { loyaltyPoints: true, lifetimePoints: true },
      })

      // 2. Recalcula tier com base nos lifetimePoints atualizados
      const newTier = computeTier(metrics.lifetimePoints)
      await trx.patientCrmMetrics.update({
        where:  { patientId },
        data:   { classification: newTier as never },
      })

      // 3. Cria o registro de transação
      const created = await trx.pointsTransaction.create({
        data: {
          patientId,
          points,
          reason:        reason as never,
          appointmentId: appointmentId ?? null,
        },
        select: { id: true, patientId: true, points: true, reason: true, appointmentId: true, createdAt: true },
      })

      return [created]
    })

    return {
      id:            tx.id,
      patientId:     tx.patientId,
      points:        tx.points,
      reason:        tx.reason as PointsTransactionRecord['reason'],
      appointmentId: tx.appointmentId,
      createdAt:     tx.createdAt,
    }
  }

  async getLoyaltyStats(patientId: string): Promise<PatientLoyaltyStats> {
    const metrics = await this.prisma.patientCrmMetrics.findUnique({
      where:  { patientId },
      select: {
        loyaltyPoints:     true,
        lifetimePoints:    true,
        classification:    true,
        totalAppointments: true,
        lastAppointmentAt: true,
        cancellationCount: true,
      },
    })

    return {
      loyaltyPoints:     metrics?.loyaltyPoints     ?? 0,
      lifetimePoints:    metrics?.lifetimePoints    ?? 0,
      tier:              (metrics?.classification   ?? 'BRONZE') as PatientTier,
      totalAppointments: metrics?.totalAppointments ?? 0,
      lastAppointmentAt: metrics?.lastAppointmentAt?.toISOString() ?? null,
      cancellationCount: metrics?.cancellationCount ?? 0,
    }
  }
}
