import type { PrismaClient } from '@myagendix/database'
import type { ClinicCancellationConfig } from './cancel-appointment-by-patient.use-case.js'

// ─── Use Case ─────────────────────────────────────────────────────────────────
//
// Cria ou atualiza a configuração do portal do paciente.
// Singleton por tenant — usa findFirst + upsert via id.
// ─────────────────────────────────────────────────────────────────────────────

export class UpsertClinicPatientConfigUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: ClinicCancellationConfig): Promise<ClinicCancellationConfig> {
    const existing = await this.prisma.clinicPatientConfig.findFirst()

    let row: typeof existing

    if (existing) {
      row = await this.prisma.clinicPatientConfig.update({
        where: { id: existing.id },
        data: {
          cancellationAllowed:           input.cancellationAllowed,
          cancellationMinHoursInAdvance: input.cancellationMinHoursInAdvance,
          cancellationAllowedStatuses:   input.cancellationAllowedStatuses,
        },
      })
    } else {
      row = await this.prisma.clinicPatientConfig.create({
        data: {
          cancellationAllowed:           input.cancellationAllowed,
          cancellationMinHoursInAdvance: input.cancellationMinHoursInAdvance,
          cancellationAllowedStatuses:   input.cancellationAllowedStatuses,
        },
      })
    }

    return {
      cancellationAllowed:           row!.cancellationAllowed,
      cancellationMinHoursInAdvance: row!.cancellationMinHoursInAdvance,
      cancellationAllowedStatuses:   row!.cancellationAllowedStatuses,
    }
  }
}
