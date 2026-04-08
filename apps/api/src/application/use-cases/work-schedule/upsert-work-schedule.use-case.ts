import type { IWorkScheduleRepository, WorkScheduleRecord, UpsertWorkScheduleData } from '../../../domain/repositories/work-schedule.repository.js'
import type { IProfessionalRepository } from '../../../domain/repositories/professional.repository.js'
import { NotFoundError, ValidationError } from '../../../domain/errors/app-error.js'

interface UpsertWorkScheduleInput extends UpsertWorkScheduleData {}

export class UpsertWorkScheduleUseCase {
  constructor(
    private readonly workScheduleRepo: IWorkScheduleRepository,
    private readonly professionalRepo: IProfessionalRepository,
  ) {}

  async execute(input: UpsertWorkScheduleInput): Promise<WorkScheduleRecord> {
    const { professionalId, dayOfWeek, startTime, endTime, slotIntervalMinutes } = input

    // Validate professional exists
    const professional = await this.professionalRepo.findById(professionalId)
    if (!professional) throw new NotFoundError('Profissional')

    // Validate dayOfWeek range
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      throw new ValidationError('dayOfWeek deve ser entre 0 (Dom) e 6 (Sab)')
    }

    // Validate time format HH:MM and logic
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
    if (!timeRegex.test(startTime)) throw new ValidationError('startTime deve estar no formato HH:MM')
    if (!timeRegex.test(endTime)) throw new ValidationError('endTime deve estar no formato HH:MM')
    if (startTime >= endTime) throw new ValidationError('startTime deve ser anterior a endTime')

    return this.workScheduleRepo.upsert({ professionalId, dayOfWeek, startTime, endTime, slotIntervalMinutes })
  }
}
