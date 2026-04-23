import type { IUserRepository, UserPublic } from '../../../domain/repositories/user.repository.js'
import { NotFoundError } from '../../../domain/errors/app-error.js'

export class ToggleUserActiveUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(userId: string, isActive: boolean): Promise<UserPublic> {
    const existing = await this.userRepo.findById(userId)
    if (!existing) throw new NotFoundError('Usuário')
    return this.userRepo.setActive(userId, isActive)
  }
}
