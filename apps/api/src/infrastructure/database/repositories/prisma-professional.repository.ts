import type { PrismaClient } from '@prisma/client'

import type {
  IProfessionalRepository,
  ProfessionalRecord,
  ProfessionalWithProcedures,
  CreateProfessionalData,
  UpdateProfessionalData,
  ListProfessionalsParams,
  PaginatedResult,
} from '../../../domain/repositories/professional.repository.js'

// ─── Selects reutilizáveis ────────────────────────────────────────────────────

const procedureSelect = {
  procedure: {
    select: { id: true, name: true, durationMinutes: true, color: true },
  },
}

const professionalWithProceduresSelect = {
  id: true,
  userId: true,
  name: true,
  specialty: true,
  bio: true,
  avatarUrl: true,
  color: true,
  birthDate: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  procedures: { select: procedureSelect },
}

// ─── Mapper ──────────────────────────────────────────────────────────────────

function mapWithProcedures(raw: {
  id: string
  userId: string | null
  name: string
  specialty: string | null
  bio: string | null
  avatarUrl: string | null
  color: string | null
  birthDate: Date | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  procedures: Array<{ procedure: { id: string; name: string; durationMinutes: number; color: string | null } }>
}): ProfessionalWithProcedures {
  return {
    id: raw.id,
    userId: raw.userId,
    name: raw.name,
    specialty: raw.specialty,
    bio: raw.bio,
    avatarUrl: raw.avatarUrl,
    color: raw.color,
    birthDate: raw.birthDate,
    isActive: raw.isActive,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    procedures: raw.procedures.map((pp) => pp.procedure),
  }
}

// ─── Repository ──────────────────────────────────────────────────────────────

export class PrismaProfessionalRepository implements IProfessionalRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateProfessionalData): Promise<ProfessionalWithProcedures> {
    const raw = await this.prisma.professional.create({
      data: {
        name: data.name,
        specialty: data.specialty ?? null,
        bio: data.bio ?? null,
        color: data.color ?? null,
        userId: data.userId ?? null,
        avatarUrl: data.avatarUrl ?? null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
      },
      select: professionalWithProceduresSelect,
    })
    return mapWithProcedures(raw)
  }

  async findById(id: string): Promise<ProfessionalWithProcedures | null> {
    const raw = await this.prisma.professional.findUnique({
      where: { id },
      select: professionalWithProceduresSelect,
    })
    return raw ? mapWithProcedures(raw) : null
  }

  async list(params: ListProfessionalsParams): Promise<PaginatedResult<ProfessionalWithProcedures>> {
    const { page, limit, search, isActive } = params
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (isActive !== undefined) where['isActive'] = isActive
    if (search) {
      where['OR'] = [
        { name: { contains: search, mode: 'insensitive' } },
        { specialty: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [raws, total] = await Promise.all([
      this.prisma.professional.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: professionalWithProceduresSelect,
      }),
      this.prisma.professional.count({ where }),
    ])

    return {
      data: raws.map(mapWithProcedures),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async update(id: string, data: UpdateProfessionalData): Promise<ProfessionalWithProcedures> {
    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined)      updateData['name']      = data.name
    if (data.specialty !== undefined) updateData['specialty'] = data.specialty
    if (data.bio !== undefined)       updateData['bio']       = data.bio
    if (data.color !== undefined)     updateData['color']     = data.color
    if (data.userId !== undefined)    updateData['userId']    = data.userId
    if (data.avatarUrl !== undefined) updateData['avatarUrl'] = data.avatarUrl
    if (data.birthDate !== undefined) updateData['birthDate'] = data.birthDate ? new Date(data.birthDate) : null

    const raw = await this.prisma.professional.update({
      where: { id },
      data: updateData,
      select: professionalWithProceduresSelect,
    })
    return mapWithProcedures(raw)
  }

  async setActive(id: string, isActive: boolean): Promise<ProfessionalRecord> {
    return this.prisma.professional.update({
      where: { id },
      data: { isActive },
      select: {
        id: true, userId: true, name: true, specialty: true,
        bio: true, avatarUrl: true, color: true, birthDate: true,
        isActive: true, createdAt: true, updatedAt: true,
      },
    })
  }

  async linkProcedures(professionalId: string, procedureIds: string[]): Promise<void> {
    // createMany com skipDuplicates para ser idempotente
    await this.prisma.professionalProcedure.createMany({
      data: procedureIds.map((procedureId) => ({ professionalId, procedureId })),
      skipDuplicates: true,
    })
  }

  async unlinkProcedure(professionalId: string, procedureId: string): Promise<void> {
    await this.prisma.professionalProcedure.delete({
      where: { professionalId_procedureId: { professionalId, procedureId } },
    })
  }
}
