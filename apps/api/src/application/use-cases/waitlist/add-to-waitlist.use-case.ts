// ─── AddToWaitlistUseCase ─────────────────────────────────────────────────────
//
// Fluxo público e interno:
//   1. Localiza paciente pelo telefone; cria registro mínimo se inexistente.
//   2. Valida procedimento (ativo).
//   3. Valida profissional (ativo), se informado.
//   4. Cria entrada na waitlist com status WAITING.
// ─────────────────────────────────────────────────────────────────────────────

import type { IWaitlistRepository, WaitlistRecord } from '../../../domain/repositories/waitlist.repository.js'
import type { IPatientRepository } from '../../../domain/repositories/patient.repository.js'
import type { IProcedureRepository } from '../../../domain/repositories/procedure.repository.js'
import type { IProfessionalRepository } from '../../../domain/repositories/professional.repository.js'
import { NotFoundError, ValidationError } from '../../../domain/errors/app-error.js'

export interface AddToWaitlistInput {
  patientPhone: string
  patientName: string
  patientEmail?: string
  professionalId?: string
  procedureId: string
  preferredDateFrom?: string   // "YYYY-MM-DD"
  preferredDateTo?: string     // "YYYY-MM-DD"
  minAdvanceMinutes?: number
}

export class AddToWaitlistUseCase {
  constructor(
    private readonly waitlistRepo: IWaitlistRepository,
    private readonly patientRepo: IPatientRepository,
    private readonly procedureRepo: IProcedureRepository,
    private readonly professionalRepo: IProfessionalRepository,
  ) {}

  async execute(input: AddToWaitlistInput): Promise<WaitlistRecord> {
    const {
      patientPhone,
      patientName,
      patientEmail,
      professionalId,
      procedureId,
      preferredDateFrom,
      preferredDateTo,
      minAdvanceMinutes,
    } = input

    // ── 1. Encontrar ou criar paciente ────────────────────────────────────
    let patient = await this.patientRepo.findByPhone(patientPhone)
    if (!patient) {
      patient = await this.patientRepo.create({
        name: patientName,
        phone: patientPhone,
        source: 'PUBLIC_PAGE',
        ...(patientEmail !== undefined ? { email: patientEmail } : {}),
      })
    } else if (!patient.isActive) {
      throw new ValidationError('Paciente está inativo e não pode entrar na lista de espera')
    }

    // ── 2. Validar procedimento ───────────────────────────────────────────
    const procedure = await this.procedureRepo.findById(procedureId)
    if (!procedure) throw new NotFoundError('Procedimento')
    if (!procedure.isActive) throw new ValidationError('Procedimento está inativo')

    // ── 3. Validar profissional (opcional) ────────────────────────────────
    if (professionalId) {
      const professional = await this.professionalRepo.findById(professionalId)
      if (!professional) throw new NotFoundError('Profissional')
      if (!professional.isActive) throw new ValidationError('Profissional está inativo')
    }

    // ── 4. Validar intervalo de datas preferidas ──────────────────────────
    if (preferredDateFrom && preferredDateTo && preferredDateFrom > preferredDateTo) {
      throw new ValidationError('Data de início preferida não pode ser posterior à data de fim')
    }

    // ── 5. Criar entrada na waitlist ──────────────────────────────────────
    return this.waitlistRepo.create({
      patientId: patient.id,
      procedureId,
      ...(professionalId !== undefined ? { professionalId } : {}),
      ...(preferredDateFrom !== undefined ? { preferredDateFrom } : {}),
      ...(preferredDateTo !== undefined ? { preferredDateTo } : {}),
      ...(minAdvanceMinutes !== undefined ? { minAdvanceMinutes } : {}),
    })
  }
}
