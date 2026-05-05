import type {
  IWaitlistRepository,
  ListWaitlistParams,
  PaginatedWaitlist,
} from '../../../domain/repositories/waitlist.repository.js'

export class ListWaitlistUseCase {
  constructor(private readonly waitlistRepo: IWaitlistRepository) {}

  async execute(params: ListWaitlistParams): Promise<PaginatedWaitlist> {
    return this.waitlistRepo.list(params)
  }
}
