import type { PrismaClient } from '@myagendix/database'

import type {
  IUserRepository,
  UserWithRoles,
  UserPublic,
  ListUsersParams,
  PaginatedUsers,
  CreateUserData,
  UpdateUserData,
} from '../../../domain/repositories/user.repository.js'

// ─── Include helpers ──────────────────────────────────────────────────────────

const withRoles = {
  roles: { select: { role: true } },
} as const

const withPublic = {
  roles: { select: { role: true } },
  professional: { select: { id: true, name: true, specialty: true } },
} as const

// ─── PrismaUserRepository ─────────────────────────────────────────────────────

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ── Existing methods ─────────────────────────────────────────────────────

  async findByEmail(email: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: withRoles,
    }) as Promise<UserWithRoles | null>
  }

  async findById(id: string): Promise<UserWithRoles | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: withRoles,
    }) as Promise<UserWithRoles | null>
  }

  async findPublicById(id: string): Promise<UserPublic | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: withPublic,
    })
    return user as unknown as UserPublic | null
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    })
  }

  // ── New methods ──────────────────────────────────────────────────────────

  async list(params: ListUsersParams): Promise<PaginatedUsers> {
    const page  = Math.max(1, params.page  ?? 1)
    const limit = Math.min(100, Math.max(1, params.limit ?? 20))
    const skip  = (page - 1) * limit

    const where = {
      ...(params.search
        ? {
            OR: [
              { name:  { contains: params.search, mode: 'insensitive' as const } },
              { email: { contains: params.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
    }

    const [total, data] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        include: withPublic,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
    ])

    return {
      data: data as unknown as UserPublic[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async create(data: CreateUserData): Promise<UserPublic> {
    const user = await this.prisma.$transaction(async (tx) => {
      // 1. Cria o usuário
      const created = await tx.user.create({
        data: {
          name:         data.name,
          email:        data.email,
          passwordHash: data.passwordHash,
          phone:        data.phone ?? null,
          roles: { create: { role: data.role as 'GESTOR' | 'RECEPCAO' | 'PROFISSIONAL' } },
        },
        include: withPublic,
      })

      // 2. Vincula ao Professional se fornecido
      if (data.professionalId) {
        await tx.professional.update({
          where: { id: data.professionalId },
          data:  { userId: created.id },
        })
      }

      return created
    })

    return user as unknown as UserPublic
  }

  async update(id: string, data: UpdateUserData): Promise<UserPublic> {
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(data.name  !== undefined ? { name:  data.name  } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
      },
      include: withPublic,
    })
    return updated as unknown as UserPublic
  }

  async setActive(id: string, isActive: boolean): Promise<UserPublic> {
    const updated = await this.prisma.user.update({
      where: { id },
      data:  { isActive },
      include: withPublic,
    })
    return updated as unknown as UserPublic
  }
}
