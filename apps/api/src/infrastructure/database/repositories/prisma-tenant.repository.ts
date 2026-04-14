import type { PrismaClient } from '@prisma/client'

import type {
  ITenantRepository,
  TenantRecord,
  CreateTenantData,
  UpdateTenantData,
  ListTenantsParams,
  PaginatedResult,
} from '../../../domain/repositories/tenant.repository.js'

// ─── Prisma Tenant Repository ───────────────────────────────────────────────
//
// Opera no schema `public` usando o prisma client global.
// ─────────────────────────────────────────────────────────────────────────────

export class PrismaTenantRepository implements ITenantRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateTenantData): Promise<TenantRecord> {
    return this.prisma.tenant.create({
      data: {
        name: data.name,
        slug: data.slug,
        email: data.email,
        phone: data.phone ?? null,
        address: data.address ?? null,
        ...(data.planType ? { planType: data.planType as 'BASIC' | 'PRO' } : {}),
      },
    })
  }

  async findById(id: string): Promise<TenantRecord | null> {
    return this.prisma.tenant.findUnique({ where: { id } })
  }

  async findBySlug(slug: string): Promise<TenantRecord | null> {
    return this.prisma.tenant.findUnique({ where: { slug } })
  }

  async list(params: ListTenantsParams): Promise<PaginatedResult<TenantRecord>> {
    const { page, limit, search, isActive } = params
    const skip = (page - 1) * limit

    // Monta filtro dinâmico
    const where: Record<string, unknown> = {}

    if (isActive !== undefined) {
      where['isActive'] = isActive
    }

    if (search) {
      where['OR'] = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count({ where }),
    ])

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async update(id: string, data: UpdateTenantData): Promise<TenantRecord> {
    // Filtra campos undefined para evitar sobrescrever com null indesejado
    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined) updateData['name'] = data.name
    if (data.email !== undefined) updateData['email'] = data.email
    if (data.phone !== undefined) updateData['phone'] = data.phone
    if (data.address !== undefined) updateData['address'] = data.address
    if (data.planType !== undefined) updateData['planType'] = data.planType

    return this.prisma.tenant.update({
      where: { id },
      data: updateData,
    })
  }

  async setActive(id: string, isActive: boolean): Promise<TenantRecord> {
    return this.prisma.tenant.update({
      where: { id },
      data: { isActive },
    })
  }

  async delete(id: string): Promise<void> {
    await this.prisma.tenant.delete({ where: { id } })
  }
}
