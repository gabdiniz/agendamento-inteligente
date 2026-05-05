// ─── PrismaAppointmentEvaluationRepository ───────────────────────────────────
//
// Implementação Prisma do IAppointmentEvaluationRepository.
// Opera no schema do tenant via tenantPrisma.
// ─────────────────────────────────────────────────────────────────────────────

import type { PrismaClient } from '@prisma/client'
import type {
  IAppointmentEvaluationRepository,
  AppointmentEvaluationRecord,
  UpsertQuickRatingData,
  UpsertDetailedRatingData,
} from '../../../domain/repositories/appointment-evaluation.repository.js'

// ─── Raw row → domain record ──────────────────────────────────────────────────

interface EvaluationRow {
  id: string
  appointmentId: string
  patientId: string
  professionalId: string
  quickRating: string | null
  quickRatingReasons: string[]
  rating: number | null
  comment: string | null
  createdAt: Date
  updatedAt: Date
}

function toRecord(row: EvaluationRow): AppointmentEvaluationRecord {
  return {
    id:                  row.id,
    appointmentId:       row.appointmentId,
    patientId:           row.patientId,
    professionalId:      row.professionalId,
    quickRating:         row.quickRating as AppointmentEvaluationRecord['quickRating'],
    quickRatingReasons:  row.quickRatingReasons,
    rating:              row.rating,
    comment:             row.comment,
    createdAt:           row.createdAt,
    updatedAt:           row.updatedAt,
  }
}

const evaluationSelect = {
  id:                        true,
  appointmentId:             true,
  patientId:                 true,
  professionalId:            true,
  quickRating:               true,
  quickRatingReasons:        true,
  rating:                    true,
  comment:                   true,
  createdAt:                 true,
  updatedAt:                 true,
} as const

// ─────────────────────────────────────────────────────────────────────────────

export class PrismaAppointmentEvaluationRepository implements IAppointmentEvaluationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertQuickRating(data: UpsertQuickRatingData): Promise<AppointmentEvaluationRecord> {
    const row = await this.prisma.appointmentEvaluation.upsert({
      where: { appointmentId: data.appointmentId },
      create: {
        appointmentId:      data.appointmentId,
        patientId:          data.patientId,
        professionalId:     data.professionalId,
        quickRating:        data.quickRating as never,
        quickRatingReasons: data.reasons,
      },
      update: {
        quickRating:        data.quickRating as never,
        quickRatingReasons: data.reasons,
      },
      select: evaluationSelect,
    })
    return toRecord(row as EvaluationRow)
  }

  async upsertDetailedRating(data: UpsertDetailedRatingData): Promise<AppointmentEvaluationRecord> {
    const row = await this.prisma.appointmentEvaluation.upsert({
      where: { appointmentId: data.appointmentId },
      create: {
        appointmentId:  data.appointmentId,
        patientId:      data.patientId,
        professionalId: data.professionalId,
        rating:         data.rating,
        comment:        data.comment ?? null,
      },
      update: {
        rating:  data.rating,
        comment: data.comment ?? null,
      },
      select: evaluationSelect,
    })
    return toRecord(row as EvaluationRow)
  }

  async findByAppointmentId(appointmentId: string): Promise<AppointmentEvaluationRecord | null> {
    const row = await this.prisma.appointmentEvaluation.findUnique({
      where:  { appointmentId },
      select: evaluationSelect,
    })
    return row ? toRecord(row as EvaluationRow) : null
  }
}
