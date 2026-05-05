import type { IAppointmentRepository, AppointmentRecord } from '../../../domain/repositories/appointment.repository.js'
import { NotFoundError } from '../../../domain/errors/app-error.js'

export class GetAppointmentUseCase {
  constructor(private readonly appointmentRepo: IAppointmentRepository) {}

  async execute(appointmentId: string): Promise<AppointmentRecord> {
    const appointment = await this.appointmentRepo.findById(appointmentId)
    if (!appointment) throw new NotFoundError('Agendamento')
    return appointment
  }
}
