import type { IAppointmentRepository, PaginatedAppointments, ListAppointmentsParams } from '../../../domain/repositories/appointment.repository.js'

export class ListAppointmentsUseCase {
  constructor(private readonly appointmentRepo: IAppointmentRepository) {}

  async execute(params: ListAppointmentsParams): Promise<PaginatedAppointments> {
    return this.appointmentRepo.list(params)
  }
}
