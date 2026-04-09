import type { IAppointmentRepository, AppointmentRecord } from '../../../domain/repositories/appointment.repository.js'
import { NotFoundError, ValidationError } from '../../../domain/errors/app-error.js'

interface CancelAppointmentInput {
  appointmentId: string
  reason?: string
  canceledBy: 'PATIENT' | 'STAFF'
  changedByUserId?: string
}

export class CancelAppointmentUseCase {
  constructor(private readonly appointmentRepo: IAppointmentRepository) {}

  async execute(input: CancelAppointmentInput): Promise<AppointmentRecord> {
    const { appointmentId, reason, canceledBy, changedByUserId } = input

    const appointment = await this.appointmentRepo.findById(appointmentId)
    if (!appointment) throw new NotFoundError('Agendamento')

    if (appointment.status === 'CANCELED') {
      throw new ValidationError('Agendamento já está cancelado')
    }
    if (appointment.status === 'COMPLETED') {
      throw new ValidationError('Agendamentos concluídos não podem ser cancelados')
    }

    return this.appointmentRepo.cancel(appointmentId, reason, canceledBy, changedByUserId)
  }
}
