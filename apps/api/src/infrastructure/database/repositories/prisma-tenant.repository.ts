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

// Include padrão para buscar plano junto com o tenant
const WITH_PLAN = {
  plan: {
    select: { id: true, name: true, slug: true, description: true },
  },
} as const

export class PrismaTenantRepository implements ITenantRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateTenantData): Promise<TenantRecord> {
    return this.prisma.tenant.create({
      data: {
        name:           data.name,
        slug:           data.slug,
        email:          data.email,
        phone:          data.phone ?? null,
        address:        data.address ?? null,
        logoUrl:        data.logoUrl ?? null,
        colorPrimary:   data.colorPrimary   ?? null,
        colorSecondary: data.colorSecondary ?? null,
        colorSidebar:   data.colorSidebar   ?? null,
        ...(data.planType ? { planType: data.planType as 'BASIC' | 'PRO' } : {}),
        ...(data.planId   ? { planId: data.planId } : {}),
      },
      include: WITH_PLAN,
    }) as unknown as TenantRecord
  }

  async findById(id: string): Promise<TenantRecord | null> {
    return this.prisma.tenant.findUnique({
      where:   { id },
      include: WITH_PLAN,
    }) as unknown as TenantRecord | null
  }

  async findBySlug(slug: string): Promise<TenantRecord | null> {
    return this.prisma.tenant.findUnique({
      where:   { slug },
      include: WITH_PLAN,
    }) as unknown as TenantRecord | null
  }

  async list(params: ListTenantsParams): Promise<PaginatedResult<TenantRecord>> {
    const { page, limit, search, isActive } = params
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (isActive !== undefined) {
      where['isActive'] = isActive
    }

    if (search) {
      where['OR'] = [
        { name:  { contains: search, mode: 'insensitive' } },
        { slug:  { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        include: WITH_PLAN,
      }),
      this.prisma.tenant.count({ where }),
    ])

    return {
      data: data as unknown as TenantRecord[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async update(id: string, data: UpdateTenantData): Promise<TenantRecord> {
    const updateData: Record<string, unknown> = {}

    if (data.name           !== undefined) updateData['name']           = data.name
    if (data.email          !== undefined) updateData['email']          = data.email
    if (data.phone          !== undefined) updateData['phone']          = data.phone
    if (data.address        !== undefined) updateData['address']        = data.address
    if (data.planType       !== undefined) updateData['planType']       = data.planType
    if (data.planId         !== undefined) updateData['planId']         = data.planId
    if (data.logoUrl        !== undefined) updateData['logoUrl']        = data.logoUrl
    if (data.colorPrimary   !== undefined) updateData['colorPrimary']   = data.colorPrimary
    if (data.colorSecondary !== undefined) updateData['colorSecondary'] = data.colorSecondary
    if (data.colorSidebar   !== undefined) updateData['colorSidebar']   = data.colorSidebar

    return this.prisma.tenant.update({
      where:   { id },
      data:    updateData,
      include: WITH_PLAN,
    }) as unknown as TenantRecord
  }

  async setActive(id: string, isActive: boolean): Promise<TenantRecord> {
    return this.prisma.tenant.update({
      where:   { id },
      data:    { isActive },
      include: WITH_PLAN,
    }) as unknown as TenantRecord
  }

  async delete(id: string): Promise<void> {
    await this.prisma.tenant.delete({ where: { id } })
  }
}
