import type { IWorkScheduleRepository } from '../../../domain/repositories/work-schedule.repository.js'
import type { IProfessionalRepository } from '../../../domain/repositories/professional.repository.js'
import { NotFoundError, ValidationError } from '../../../domain/errors/app-error.js'

export class DeleteWorkScheduleDayUseCase {
  constructor(
    private readonly workScheduleRepo: IWorkScheduleRepository,
    private readonly professionalRepo: IProfessionalRepository,
  ) {}

  async execute(professionalId: string, dayOfWeek: number): Promise<void> {
    const professional = await this.professionalRepo.findById(professionalId)
    if (!professional) throw new NotFoundError('Profissional')

    if (dayOfWeek < 0 || dayOfWeek > 6) {
      throw new ValidationError('dayOfWeek deve ser entre 0 (Dom) e 6 (Sab)')
    }

    await this.workScheduleRepo.deleteByDay(professionalId, dayOfWeek)
  }
}
