import type { IWorkScheduleRepository, WorkScheduleRecord } from '../../../domain/repositories/work-schedule.repository.js'
import type { IProfessionalRepository } from '../../../domain/repositories/professional.repository.js'
import { NotFoundError, ValidationError } from '../../../domain/errors/app-error.js'

export class ToggleWorkScheduleDayUseCase {
  constructor(
    private readonly workScheduleRepo: IWorkScheduleRepository,
    private readonly professionalRepo: IProfessionalRepository,
  ) {}

  async execute(professionalId: string, dayOfWeek: number, isActive: boolean): Promise<WorkScheduleRecord> {
    const professional = await this.professionalRepo.findById(professionalId)
    if (!professional) throw new NotFoundError('Profissional')

    if (dayOfWeek < 0 || dayOfWeek > 6) {
      throw new ValidationError('dayOfWeek deve ser entre 0 (Dom) e 6 (Sab)')
    }

    return this.workScheduleRepo.setActive(professionalId, dayOfWeek, isActive)
  }
}
