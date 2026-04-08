import type { PrismaClient } from '@myagendix/database'

import type {
  IUserRepository,
  UserWithRoles,
} from '../../../domain/repositories/user.repository.js'

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: { roles: { select: { role: true } } },
    }) as Promise<UserWithRoles | null>
  }

  async findById(id: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { roles: { select: { role: true } } },
    }) as Promise<UserWithRoles | null>
  }
}
