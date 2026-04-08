import type { PrismaClient } from '@prisma/client'

import type { ITenantRepository, TenantRecord } from '../../../domain/repositories/tenant.repository.js'
import type { IHashService } from '../../../domain/services/hash.service.js'
import { ConflictError } from '../../../domain/errors/app-error.js'

// ─── Create Tenant Use Case ─────────────────────────────────────────────────
//
// Fluxo completo de onboarding de clínica:
//   1. Verifica se slug já existe
//   2. Cria registro do tenant no schema public
//   3. Cria schema PostgreSQL + tabelas via createTenantSchema
//   4. Cria o usuário Gestor inicial no schema do tenant
//   5. Retorna tenant + credenciais do gestor
//
// Se qualquer etapa falhar após a criação do tenant, o tenant já foi criado
// no banco — o schema pode ser re-criado idempotentemente.
// ─────────────────────────────────────────────────────────────────────────────

interface GestorInput {
  name: string
  email: string
  password: string
  phone?: string
}

interface CreateTenantInput {
  name: string
  slug: string
  email: string
  phone?: string
  address?: string
  gestor: GestorInput
}

interface CreateTenantOutput {
  tenant: TenantRecord
  gestor: {
    id: string
    name: string
    email: string
  }
  tenantSchema: string
}

export class CreateTenantUseCase {
  constructor(
    private readonly tenantRepo: ITenantRepository,
    private readonly hashService: IHashService,
    private readonly createTenantSchemaFn: (slug: string) => Promise<string>,
    private readonly createTenantClientFn: (schema: string) => PrismaClient,
  ) {}

  async execute(input: CreateTenantInput): Promise<CreateTenantOutput> {
    // 1. Verifica unicidade do slug
    const existing = await this.tenantRepo.findBySlug(input.slug)
    if (existing) {
      throw new ConflictError(`Slug "${input.slug}" já está em uso`)
    }

    // 2. Cria o tenant no schema public
    const tenant = await this.tenantRepo.create({
      name: input.name,
      slug: input.slug,
      email: input.email,
      phone: input.phone,
      address: input.address,
    })

    // 3. Cria o schema PostgreSQL + aplica tabelas
    const tenantSchema = await this.createTenantSchemaFn(input.slug)

    // 4. Cria o usuário Gestor inicial no schema do tenant
    const tenantPrisma = this.createTenantClientFn(tenantSchema)

    try {
      const passwordHash = await this.hashService.hashPassword(input.gestor.password)

      const gestorUser = await tenantPrisma.user.create({
        data: {
          name: input.gestor.name,
          email: input.gestor.email,
          passwordHash,
          phone: input.gestor.phone ?? null,
          roles: {
            create: [{ role: 'GESTOR' }],
          },
        },
      })

      return {
        tenant,
        gestor: {
          id: gestorUser.id,
          name: gestorUser.name,
          email: gestorUser.email,
        },
        tenantSchema,
      }
    } finally {
      await tenantPrisma.$disconnect()
    }
  }
}
