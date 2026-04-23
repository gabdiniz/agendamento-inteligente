import type { IUserRepository, PaginatedUsers, ListUsersParams } from '../../../domain/repositories/user.repository.js'

export class ListUsersUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(params: ListUsersParams): Promise<PaginatedUsers> {
    return this.userRepo.list(params)
  }
}
