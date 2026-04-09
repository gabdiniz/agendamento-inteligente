import type { PrismaClient } from '@prisma/client'

import type {
  IWaitlistRepository,
  WaitlistRecord,
  CreateWaitlistData,
  ListWaitlistParams,
  PaginatedWaitlist,
  FindCandidatesParams,
} from '../../../domain/repositories/waitlist.repository.js'

// ─── Date helpers ─────────────────────────────────────────────────────────────

function dateStringToDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`)
}

function dateToDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// Converte "HH:MM" para minutos desde meia-noite (para comparação de advance)
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h! * 60 + m!
}

// ─── Prisma select ────────────────────────────────────────────────────────────

const waitlistSelect = {
  id: true,
  patientId: true,
  professionalId: true,
  procedureId: true,
  preferredDateFrom: true,
  preferredDateTo: true,
  minAdvanceMinutes: true,
  status: true,
  notifiedAt: true,
  confirmedAt: true,
  expiresAt: true,
  appointmentId: true,
  createdAt: true,
  updatedAt: true,
  patient: { select: { id: true, name: true, phone: true } },
  professional: { select: { id: true, name: true } },
  procedure: { select: { id: true, name: true, durationMinutes: true } },
}

// ─── Raw row shape ─────────────────────────────────────────────────────────────

interface WaitlistRow {
  id: string
  patientId: string
  professionalId: string | null
  procedureId: string
  preferredDateFrom: Date | null
  preferredDateTo: Date | null
  minAdvanceMinutes: number
  status: string
  notifiedAt: Date | null
  confirmedAt: Date | null
  expiresAt: Date | null
  appointmentId: string | null
  createdAt: Date
  updatedAt: Date
  patient: { id: string; name: string; phone: string }
  professional: { id: string; name: string } | null
  procedure: { id: string; name: string; durationMinutes: number }
}

function toRecord(row: WaitlistRow): WaitlistRecord {
  return {
    id: row.id,
    patientId: row.patientId,
    professionalId: row.professionalId,
    procedureId: row.procedureId,
    preferredDateFrom: row.preferredDateFrom ? dateToDateString(row.preferredDateFrom) : null,
    preferredDateTo: row.preferredDateTo ? dateToDateString(row.preferredDateTo) : null,
    minAdvanceMinutes: row.minAdvanceMinutes,
    status: row.status,
    notifiedAt: row.notifiedAt,
    confirmedAt: row.confirmedAt,
    expiresAt: row.expiresAt,
    appointmentId: row.appointmentId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    patient: row.patient,
    professional: row.professional,
    procedure: row.procedure,
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export class PrismaWaitlistRepository implements IWaitlistRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateWaitlistData): Promise<WaitlistRecord> {
    const row = await this.prisma.waitlistEntry.create({
      data: {
        patientId: data.patientId,
        professionalId: data.professionalId ?? null,
        procedureId: data.procedureId,
        preferredDateFrom: data.preferredDateFrom
          ? dateStringToDate(data.preferredDateFrom)
          : null,
        preferredDateTo: data.preferredDateTo
          ? dateStringToDate(data.preferredDateTo)
          : null,
        minAdvanceMinutes: data.minAdvanceMinutes ?? 60,
      },
      select: waitlistSelect,
    })
    return toRecord(row as WaitlistRow)
  }

  async findById(id: string): Promise<WaitlistRecord | null> {
    const row = await this.prisma.waitlistEntry.findUnique({
      where: { id },
      select: waitlistSelect,
    })
    return row ? toRecord(row as WaitlistRow) : null
  }

  async list(params: ListWaitlistParams): Promise<PaginatedWaitlist> {
    const { page, limit, status, procedureId, professionalId, patientId } = params
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status) where['status'] = status
    if (procedureId) where['procedureId'] = procedureId
    if (professionalId) where['professionalId'] = professionalId
    if (patientId) where['patientId'] = patientId

    const [rows, total] = await Promise.all([
      this.prisma.waitlistEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' }, // FIFO: quem chegou primeiro tem prioridade
        select: waitlistSelect,
      }),
      this.prisma.waitlistEntry.count({ where }),
    ])

    return {
      data: (rows as WaitlistRow[]).map(toRecord),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  // ─── findCandidates ──────────────────────────────────────────────────────
  //
  // Retorna entradas WAITING elegíveis para uma vaga recém-aberta:
  //   • Mesmo procedimento.
  //   • Profissional coincide ou entry não especificou profissional.
  //   • vacancyDate dentro do intervalo preferredDateFrom..preferredDateTo
  //     (null em qualquer extremo = sem restrição).
  //   • Advance suficiente: vaga deve ser daqui a pelo menos minAdvanceMinutes.
  //     (calculado em memória após carregar registros — simples e correto).
  // ─────────────────────────────────────────────────────────────────────────

  async findCandidates(params: FindCandidatesParams): Promise<WaitlistRecord[]> {
    const { procedureId, professionalId, vacancyDate, vacancyStartTime } = params

    // Monta filtro de data preferida
    const vacancyDateObj = dateStringToDate(vacancyDate)

    const where: Record<string, unknown> = {
      status: 'WAITING',
      procedureId,
      // Data da vaga deve estar dentro da janela preferida (quando especificada)
      AND: [
        {
          OR: [
            { preferredDateFrom: null },
            { preferredDateFrom: { lte: vacancyDateObj } },
          ],
        },
        {
          OR: [
            { preferredDateTo: null },
            { preferredDateTo: { gte: vacancyDateObj } },
          ],
        },
      ],
    }

    // Filtro de profissional: OR (sem preferência OR o mesmo)
    if (professionalId) {
      where['OR'] = [
        { professionalId: null },
        { professionalId },
      ]
    }

    const rows = await this.prisma.waitlistEntry.findMany({
      where,
      orderBy: { createdAt: 'asc' }, // FIFO
      select: waitlistSelect,
    })

    const records = (rows as WaitlistRow[]).map(toRecord)

    // ── Filtro de advance em memória ──────────────────────────────────────
    // Calcula quantos minutos separam "agora" da vaga (data + horário).
    // Se a vaga é hoje e o vacancyStartTime já passou ou está muito próximo,
    // o minAdvanceMinutes pode não ser satisfeito.
    const now = new Date()
    const vacancyDateTime = new Date(
      `${vacancyDate}T${vacancyStartTime}:00.000Z`,
    )
    const advanceMinutesAvailable = (vacancyDateTime.getTime() - now.getTime()) / 60_000

    return records.filter((entry) => advanceMinutesAvailable >= entry.minAdvanceMinutes)
  }

  async updateStatus(
    id: string,
    status: string,
    options?: {
      notifiedAt?: Date
      confirmedAt?: Date
      expiresAt?: Date
      appointmentId?: string
    },
  ): Promise<WaitlistRecord> {
    const row = await this.prisma.waitlistEntry.update({
      where: { id },
      data: {
        status: status as never,
        notifiedAt: options?.notifiedAt ?? undefined,
        confirmedAt: options?.confirmedAt ?? undefined,
        expiresAt: options?.expiresAt ?? undefined,
        appointmentId: options?.appointmentId ?? undefined,
      },
      select: waitlistSelect,
    })
    return toRecord(row as WaitlistRow)
  }

  async remove(id: string): Promise<void> {
    await this.prisma.waitlistEntry.delete({ where: { id } })
  }
}
