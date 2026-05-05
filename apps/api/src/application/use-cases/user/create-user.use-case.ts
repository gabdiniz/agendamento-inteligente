import { HashService } from '../../../infrastructure/services/hash.service.js'

import type { IUserRepository, UserPublic, CreateUserData } from '../../../domain/repositories/user.repository.js'
import { ConflictError } from '../../../domain/errors/app-error.js'

export interface CreateUserInput {
  name: string
  email: string
  password: string
  phone?: string
  role: 'GESTOR' | 'RECEPCAO' | 'PROFISSIONAL'
  professionalId?: string
}

const hashService = new HashService()

export class CreateUserUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(input: CreateUserInput): Promise<UserPublic> {
    // Verifica unicidade de e-mail
    const existing = await this.userRepo.findByEmail(input.email)
    if (existing) {
      throw new ConflictError(`Já existe um usuário cadastrado com o e-mail ${input.email}`)
    }

    const passwordHash = await hashService.hashPassword(input.password)

    const data: CreateUserData = {
      name:           input.name,
      email:          input.email,
      passwordHash,
      phone:          input.phone,
      role:           input.role,
      professionalId: input.professionalId,
    }

    return this.userRepo.create(data)
  }
}
