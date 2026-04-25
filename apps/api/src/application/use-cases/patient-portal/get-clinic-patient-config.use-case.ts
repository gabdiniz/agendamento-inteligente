import type { PrismaClient } from '@myagendix/database'
import {
  DEFAULT_CANCELLATION_CONFIG,
  type ClinicCancellationConfig,
} from './cancel-appointment-by-patient.use-case.js'

// ─── Use Case ─────────────────────────────────────────────────────────────────
//
// Lê a configuração do portal do paciente para o tenant.
// Se a clínica ainda não configurou, retorna os defaults sem criar registro.
// ─────────────────────────────────────────────────────────────────────────────

export class GetClinicPatientConfigUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(): Promise<ClinicCancellationConfig> {
    const row = await this.prisma.clinicPatientConfig.findFirst()

    if (!row) return { ...DEFAULT_CANCELLATION_CONFIG }

    return {
      cancellationAllowed:           row.cancellationAllowed,
      cancellationMinHoursInAdvance: row.cancellationMinHoursInAdvance,
      cancellationAllowedStatuses:   row.cancellationAllowedStatuses,
    }
  }
}
