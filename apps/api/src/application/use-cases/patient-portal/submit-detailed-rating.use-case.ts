// ─── SubmitDetailedRatingUseCase ──────────────────────────────────────────────
//
// M11 — Avaliação Detalhada: salva nota (1–5) e comentário opcional.
// Upsert idempotente — paciente pode editar enquanto não houver restrição de prazo.
//
// Validações:
//   - Agendamento deve existir e pertencer ao paciente
//   - Status deve ser COMPLETED
//   - Rating deve estar entre 1 e 5
// ─────────────────────────────────────────────────────────────────────────────

import type { IAppointmentRepository }           from '../../../domain/repositories/appointment.repository.js'
import type { IAppointmentEvaluationRepository } from '../../../domain/repositories/appointment-evaluation.repository.js'
import type { AppointmentEvaluationRecord }       from '../../../domain/repositories/appointment-evaluation.repository.js'

// ─── Input / Output ───────────────────────────────────────────────────────────

export interface SubmitDetailedRatingInput {
  appointmentId: string
  patientId:     string
  rating:        number    // 1–5
  comment?:      string
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export class DetailedRatingNotFoundError    extends Error { constructor() { super('Agendamento não encontrado') } }
export class DetailedRatingForbiddenError   extends Error { constructor() { super('Acesso negado') } }
export class DetailedRatingStatusError      extends Error { constructor() { super('Só é possível avaliar consultas concluídas') } }
export class DetailedRatingInvalidError     extends Error { constructor() { super('Nota deve ser entre 1 e 5') } }

// ─────────────────────────────────────────────────────────────────────────────

export class SubmitDetailedRatingUseCase {
  constructor(
    private readonly appointmentRepo: IAppointmentRepository,
    private readonly evaluationRepo:  IAppointmentEvaluationRepository,
  ) {}

  async execute(input: SubmitDetailedRatingInput): Promise<AppointmentEvaluationRecord> {
    const { appointmentId, patientId, rating, comment } = input

    // Valida rating
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new DetailedRatingInvalidError()
    }

    // Carrega agendamento
    const appointment = await this.appointmentRepo.findById(appointmentId)
    if (!appointment) throw new DetailedRatingNotFoundError()
    if (appointment.patientId !== patientId) throw new DetailedRatingForbiddenError()
    if (appointment.status !== 'COMPLETED') throw new DetailedRatingStatusError()

    return this.evaluationRepo.upsertDetailedRating({
      appointmentId,
      patientId,
      professionalId: appointment.professionalId,
      rating,
      comment,
    })
  }
}
