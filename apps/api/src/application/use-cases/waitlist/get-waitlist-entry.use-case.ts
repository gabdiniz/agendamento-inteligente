import type { IWaitlistRepository, WaitlistRecord } from '../../../domain/repositories/waitlist.repository.js'
import { NotFoundError } from '../../../domain/errors/app-error.js'

export class GetWaitlistEntryUseCase {
  constructor(private readonly waitlistRepo: IWaitlistRepository) {}

  async execute(id: string): Promise<WaitlistRecord> {
    const entry = await this.waitlistRepo.findById(id)
    if (!entry) throw new NotFoundError('Entrada na lista de espera')
    return entry
  }
}
