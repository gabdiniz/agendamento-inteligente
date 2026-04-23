import type { IUserRepository, UserPublic, UpdateUserData } from '../../../domain/repositories/user.repository.js'
import { NotFoundError } from '../../../domain/errors/app-error.js'

export class UpdateUserUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(userId: string, data: UpdateUserData): Promise<UserPublic> {
    const existing = await this.userRepo.findById(userId)
    if (!existing) throw new NotFoundError('Usuário')
    return this.userRepo.update(userId, data)
  }
}
