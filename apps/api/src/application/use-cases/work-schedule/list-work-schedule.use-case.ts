import type { IWorkScheduleRepository, WorkScheduleRecord } from '../../../domain/repositories/work-schedule.repository.js'
import type { IProfessionalRepository } from '../../../domain/repositories/professional.repository.js'
import { NotFoundError } from '../../../domain/errors/app-error.js'

export class ListWorkScheduleUseCase {
  constructor(
    private readonly workScheduleRepo: IWorkScheduleRepository,
    private readonly professionalRepo: IProfessionalRepository,
  ) {}

  async execute(professionalId: string): Promise<WorkScheduleRecord[]> {
    const professional = await this.professionalRepo.findById(professionalId)
    if (!professional) throw new NotFoundError('Profissional')

    return this.workScheduleRepo.findByProfessional(professionalId)
  }
}
