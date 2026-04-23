import type { PrismaClient } from '@prisma/client'
import { Gender, NotificationChannel } from '@prisma/client'

import type {
  IPatientRepository,
  PatientRecord,
  CreatePatientData,
  UpdatePatientData,
  ListPatientsParams,
  PaginatedPatients,
} from '../../../domain/repositories/patient.repository.js'

// ─── Date helpers ─────────────────────────────────────────────────────────────
// birthDate vem do domínio como "YYYY-MM-DD" e é armazenado como @db.Date.
// Ao ler, Prisma retorna um Date às 00:00:00 UTC — mantemos assim no PatientRecord.
// ─────────────────────────────────────────────────────────────────────────────

function parseBirthDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`)
}

// ─── Raw shape returned by Prisma ─────────────────────────────────────────────

interface PatientRow {
  id: string
  name: string
  phone: string
  email: string | null
  birthDate: Date | null
  gender: string | null
  city: string | null
  preferredContactChannel: string | null
  marketingOptIn: boolean
  notes: string | null
  source: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

function toRecord(row: PatientRow): PatientRecord {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    birthDate: row.birthDate,
    gender: row.gender,
    city: row.city,
    preferredContactChannel: row.preferredContactChannel,
    marketingOptIn: row.marketingOptIn,
    notes: row.notes,
    source: row.source,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

// ─── Patient select (campos básicos, sem relações) ────────────────────────────

const patientSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  birthDate: true,
  gender: true,
  city: true,
  preferredContactChannel: true,
  marketingOptIn: true,
  notes: true,
  source: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
}

// ─────────────────────────────────────────────────────────────────────────────

export class PrismaPatientRepository implements IPatientRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreatePatientData): Promise<PatientRecord> {
    const row = await this.prisma.patient.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email ?? null,
        birthDate: data.birthDate ? parseBirthDate(data.birthDate) : null,
        gender: (data.gender as Gender | undefined) ?? null,
        city: data.city ?? null,
        preferredContactChannel: (data.preferredContactChannel as NotificationChannel | undefined) ?? null,
        marketingOptIn: data.marketingOptIn ?? false,
        notes: data.notes ?? null,
        source: (data.source as never) ?? 'MANUAL',
      },
      select: patientSelect,
    })
    return toRecord(row as PatientRow)
  }

  async findById(id: string): Promise<PatientRecord | null> {
    const row = await this.prisma.patient.findUnique({
      where: { id },
      select: patientSelect,
    })
    return row ? toRecord(row as PatientRow) : null
  }

  async findByPhone(phone: string): Promise<PatientRecord | null> {
    const row = await this.prisma.patient.findUnique({
      where: { phone },
      select: patientSelect,
    })
    return row ? toRecord(row as PatientRow) : null
  }

  async list(params: ListPatientsParams): Promise<PaginatedPatients> {
    const { page, limit, search, isActive } = params
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (isActive !== undefined) where['isActive'] = isActive
    if (search) {
      where['OR'] = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: patientSelect,
      }),
      this.prisma.patient.count({ where }),
    ])

    return {
      data: (rows as PatientRow[]).map(toRecord),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async update(id: string, data: UpdatePatientData): Promise<PatientRecord> {
    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData['name'] = data.name
    if (data.phone !== undefined) updateData['phone'] = data.phone
    if (data.email !== undefined) updateData['email'] = data.email
    if (data.birthDate !== undefined) {
      updateData['birthDate'] = data.birthDate ? parseBirthDate(data.birthDate) : null
    }
    if (data.gender !== undefined) updateData['gender'] = data.gender
    if (data.city !== undefined) updateData['city'] = data.city
    if (data.preferredContactChannel !== undefined) {
      updateData['preferredContactChannel'] = data.preferredContactChannel
    }
    if (data.marketingOptIn !== undefined) updateData['marketingOptIn'] = data.marketingOptIn
    if (data.notes !== undefined) updateData['notes'] = data.notes

    const row = await this.prisma.patient.update({
      where: { id },
      data: updateData,
      select: patientSelect,
    })
    return toRecord(row as PatientRow)
  }

  async setActive(id: string, isActive: boolean): Promise<PatientRecord> {
    const row = await this.prisma.patient.update({
      where: { id },
      data: { isActive },
      select: patientSelect,
    })
    return toRecord(row as PatientRow)
  }
}
