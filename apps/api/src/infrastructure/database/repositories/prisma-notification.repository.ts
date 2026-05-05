import type { PrismaClient } from '@prisma/client'

import type {
  INotificationRepository,
  NotificationRecord,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  CreateNotificationData,
  ListNotificationsParams,
  PaginatedNotifications,
} from '../../../domain/repositories/notification.repository.js'

// ─── Raw row shape ─────────────────────────────────────────────────────────────

interface NotificationRow {
  id: string
  patientId: string | null
  userId: string | null
  type: string
  channel: string
  recipient: string
  content: string
  status: string
  appointmentId: string | null
  externalId: string | null
  sentAt: Date | null
  failedReason: string | null
  createdAt: Date
}

function toRecord(row: NotificationRow): NotificationRecord {
  return {
    id: row.id,
    patientId: row.patientId,
    userId: row.userId,
    type: row.type as NotificationType,
    channel: row.channel as NotificationChannel,
    recipient: row.recipient,
    content: row.content,
    status: row.status as NotificationStatus,
    appointmentId: row.appointmentId,
    externalId: row.externalId,
    sentAt: row.sentAt,
    failedReason: row.failedReason,
    createdAt: row.createdAt,
  }
}

const notificationSelect = {
  id: true,
  patientId: true,
  userId: true,
  type: true,
  channel: true,
  recipient: true,
  content: true,
  status: true,
  appointmentId: true,
  externalId: true,
  sentAt: true,
  failedReason: true,
  createdAt: true,
}

// ─────────────────────────────────────────────────────────────────────────────

export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateNotificationData): Promise<NotificationRecord> {
    const row = await this.prisma.notification.create({
      data: {
        type: data.type as never,
        channel: data.channel as never,
        recipient: data.recipient,
        content: data.content,
        patientId: data.patientId ?? null,
        userId: data.userId ?? null,
        appointmentId: data.appointmentId ?? null,
      },
      select: notificationSelect,
    })
    return toRecord(row as NotificationRow)
  }

  async findById(id: string): Promise<NotificationRecord | null> {
    const row = await this.prisma.notification.findUnique({
      where: { id },
      select: notificationSelect,
    })
    return row ? toRecord(row as NotificationRow) : null
  }

  async list(params: ListNotificationsParams): Promise<PaginatedNotifications> {
    const { page, limit, status, type, channel, patientId, appointmentId } = params
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status) where['status'] = status
    if (type) where['type'] = type
    if (channel) where['channel'] = channel
    if (patientId) where['patientId'] = patientId
    if (appointmentId) where['appointmentId'] = appointmentId

    const [rows, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: notificationSelect,
      }),
      this.prisma.notification.count({ where }),
    ])

    return {
      data: (rows as NotificationRow[]).map(toRecord),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async markSent(id: string, externalId?: string): Promise<NotificationRecord> {
    const row = await this.prisma.notification.update({
      where: { id },
      data: {
        status: 'SENT' as never,
        sentAt: new Date(),
        externalId: externalId ?? null,
        failedReason: null,
      },
      select: notificationSelect,
    })
    return toRecord(row as NotificationRow)
  }

  async markFailed(id: string, reason: string): Promise<NotificationRecord> {
    const row = await this.prisma.notification.update({
      where: { id },
      data: {
        status: 'FAILED' as never,
        failedReason: reason,
      },
      select: notificationSelect,
    })
    return toRecord(row as NotificationRow)
  }

  async markRead(id: string): Promise<NotificationRecord> {
    const row = await this.prisma.notification.update({
      where: { id },
      data: { status: 'READ' as never },
      select: notificationSelect,
    })
    return toRecord(row as NotificationRow)
  }
}
