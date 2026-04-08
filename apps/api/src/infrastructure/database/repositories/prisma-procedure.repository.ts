import type { PrismaClient } from '@prisma/client'

import type {
  IProcedureRepository,
  ProcedureRecord,
  CreateProcedureData,
  UpdateProcedureData,
  ListProceduresParams,
} from '../../../domain/repositories/procedure.repository.js'

export class PrismaProcedureRepository implements IProcedureRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateProcedureData): Promise<ProcedureRecord> {
    return this.prisma.procedure.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        durationMinutes: data.durationMinutes,
        color: data.color ?? null,
      },
    })
  }

  async findById(id: string): Promise<ProcedureRecord | null> {
    return this.prisma.procedure.findUnique({ where: { id } })
  }

  async list(params: ListProceduresParams) {
    const { page, limit, search, isActive } = params
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (isActive !== undefined) where['isActive'] = isActive
    if (search) {
      where['OR'] = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await Promise.all([
      this.prisma.procedure.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
      this.prisma.procedure.count({ where }),
    ])

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async update(id: string, data: UpdateProcedureData): Promise<ProcedureRecord> {
    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData['name'] = data.name
    if (data.description !== undefined) updateData['description'] = data.description
    if (data.durationMinutes !== undefined) updateData['durationMinutes'] = data.durationMinutes
    if (data.color !== undefined) updateData['color'] = data.color

    return this.prisma.procedure.update({ where: { id }, data: updateData })
  }

  async setActive(id: string, isActive: boolean): Promise<ProcedureRecord> {
    return this.prisma.procedure.update({ where: { id }, data: { isActive } })
  }
}
