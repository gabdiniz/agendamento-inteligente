import type { IUserRepository, UserPublic } from '../../../domain/repositories/user.repository.js'
import { NotFoundError } from '../../../domain/errors/app-error.js'

export class GetUserUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(userId: string): Promise<UserPublic> {
    const user = await this.userRepo.findPublicById(userId)
    if (!user) throw new NotFoundError('Usuário')
    return user
  }
}
