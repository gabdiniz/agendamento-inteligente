// ─── SubmitQuickRatingUseCase ─────────────────────────────────────────────────
//
// M9 — Avaliação Leve (V2): paciente avalia o atendimento com emoji rápido.
//
// Regras:
//   - Agendamento deve existir e pertencer ao paciente autenticado (JWT)
//   - Status deve ser COMPLETED — avaliação só ocorre após o atendimento
//   - Upsert: se já existe avaliação para o agendamento, atualiza; senão cria
// ─────────────────────────────────────────────────────────────────────────────

import { ForbiddenError, NotFoundError, UnprocessableError } from '../../../domain/errors/app-error.js'
import type { IAppointmentRepository } from '../../../domain/repositories/appointment.repository.js'
import type {
  IAppointmentEvaluationRepository,
  AppointmentEvaluationRecord,
} from '../../../domain/repositories/appointment-evaluation.repository.js'
import type { IPointsRepository } from '../../../domain/repositories/points.repository.js'
import { AwardPointsUseCase } from './award-points.use-case.js'

// ─── Input ────────────────────────────────────────────────────────────────────

export interface SubmitQuickRatingInput {
  appointmentId: string
  patientId: string          // vem do JWT
  quickRating: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'
  reasons?: string[]         // motivos — relevante para NEUTRAL / NEGATIVE
}

// ─── Use Case ─────────────────────────────────────────────────────────────────

export class SubmitQuickRatingUseCase {
  constructor(
    private readonly appointmentRepo: IAppointmentRepository,
    private readonly evaluationRepo: IAppointmentEvaluationRepository,
    // Opcional — quando injetado, concede +10 pts na primeira avaliação.
    private readonly pointsRepo?: IPointsRepository,
  ) {}

  async execute(input: SubmitQuickRatingInput): Promise<AppointmentEvaluationRecord> {
    const { appointmentId, patientId, quickRating, reasons = [] } = input

    // 1. Carrega agendamento
    const appointment = await this.appointmentRepo.findById(appointmentId)
    if (!appointment) throw new NotFoundError('Agendamento')

    // 2. Garante que pertence ao paciente autenticado
    if (appointment.patientId !== patientId) {
      throw new ForbiddenError('Você não tem permissão para avaliar este agendamento')
    }

    // 3. Só permite avaliação de agendamentos concluídos
    if (appointment.status !== 'COMPLETED') {
      throw new UnprocessableError(
        'A avaliação só está disponível após a conclusão do atendimento',
      )
    }

    // 4. Valida razões para avaliações negativas/neutras (máx. 10 por segurança)
    const sanitizedReasons = reasons.slice(0, 10)

    // 5. Verifica se já existe avaliação (para controlar concessão de pontos)
    const existingEvaluation = await this.evaluationRepo.findByAppointmentId(appointmentId)
    const isFirstRating = existingEvaluation?.quickRating == null

    // 6. Upsert — cria ou atualiza a avaliação rápida
    const result = await this.evaluationRepo.upsertQuickRating({
      appointmentId,
      patientId,
      professionalId: appointment.professionalId,
      quickRating,
      reasons: sanitizedReasons,
    })

    // 7. Concede pontos na primeira avaliação (fire-and-forget)
    if (isFirstRating && this.pointsRepo) {
      // Garante que não houve concessão anterior (proteção contra race condition)
      const alreadyAwarded = await this.pointsRepo.hasRatingPoints(patientId, appointmentId)
      if (!alreadyAwarded) {
        new AwardPointsUseCase(this.pointsRepo)
          .execute({ patientId, reason: 'QUICK_RATING_SUBMITTED', appointmentId })
          .catch((err: unknown) => {
            console.error('[SubmitQuickRating] Falha ao conceder pontos de avaliação:', err)
          })
      }
    }

    return result
  }
}
