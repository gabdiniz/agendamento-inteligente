// ─── AwardPointsUseCase ───────────────────────────────────────────────────────
//
// M10 — Gamificação: concede pontos ao paciente por ações específicas.
//
// Pontos por ação:
//   APPOINTMENT_COMPLETED   → +30 pts
//   FIRST_APPOINTMENT       → +20 pts (bônus, além do COMPLETED)
//   QUICK_RATING_SUBMITTED  → +10 pts
//
// Chamado como fire-and-forget nos use cases de:
//   - UpdateAppointmentStatusUseCase (quando → COMPLETED)
//   - SubmitQuickRatingUseCase (na primeira avaliação do agendamento)
// ─────────────────────────────────────────────────────────────────────────────

import type { IPointsRepository, PointsReason } from '../../../domain/repositories/points.repository.js'

// ─── Tabela de pontos por motivo ─────────────────────────────────────────────

const POINTS_TABLE: Record<PointsReason, number> = {
  APPOINTMENT_COMPLETED:   30,
  FIRST_APPOINTMENT:       20,
  QUICK_RATING_SUBMITTED:  10,
}

// ─── Input ────────────────────────────────────────────────────────────────────

export interface AwardPointsInput {
  patientId:     string
  reason:        PointsReason
  appointmentId?: string
}

// ─── Use Case ─────────────────────────────────────────────────────────────────

export class AwardPointsUseCase {
  constructor(private readonly pointsRepo: IPointsRepository) {}

  async execute(input: AwardPointsInput): Promise<void> {
    const { patientId, reason, appointmentId } = input
    const points = POINTS_TABLE[reason]

    await this.pointsRepo.award({ patientId, reason, points, appointmentId })
  }
}

// ─── Helper: dispara pontos de conclusão de consulta (fire-and-forget) ────────
//
// Concede APPOINTMENT_COMPLETED (+30) e, se for a primeira consulta,
// também FIRST_APPOINTMENT (+20).
//
export async function awardAppointmentCompletionPoints(
  pointsRepo: IPointsRepository,
  patientId: string,
  appointmentId: string,
): Promise<void> {
  const uc = new AwardPointsUseCase(pointsRepo)

  // Sempre concede os pontos base de conclusão
  await uc.execute({ patientId, reason: 'APPOINTMENT_COMPLETED', appointmentId })

  // Conta COMPLETED após a atualização — se este é o único, é o primeiro
  const total = await pointsRepo.countCompletedAppointments(patientId)
  if (total === 1) {
    await uc.execute({ patientId, reason: 'FIRST_APPOINTMENT', appointmentId })
  }
}
