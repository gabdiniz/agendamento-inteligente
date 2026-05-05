import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { paginationSchema, uuidSchema } from '@myagendix/shared'

import { SendNotificationUseCase } from '../../../application/use-cases/notification/send-notification.use-case.js'
import { ListNotificationsUseCase } from '../../../application/use-cases/notification/list-notifications.use-case.js'
import { RetryNotificationUseCase } from '../../../application/use-cases/notification/retry-notification.use-case.js'
import { PrismaNotificationRepository } from '../../database/repositories/prisma-notification.repository.js'

import { requireAuth, requireRoles } from '../middlewares/auth.middleware.js'

// ─── Notification Routes ──────────────────────────────────────────────────────
//
// GET   /t/:slug/notifications              → listar (GESTOR | RECEPCAO)
// POST  /t/:slug/notifications              → enviar (GESTOR | RECEPCAO)
// POST  /t/:slug/notifications/:id/retry   → reenviar FAILED (GESTOR)
// PATCH /t/:slug/notifications/:id/read    → marcar como READ (requireAuth)
// ─────────────────────────────────────────────────────────────────────────────

const notificationTypeEnum = z.enum([
  'APPOINTMENT_CONFIRMATION',
  'APPOINTMENT_REMINDER',
  'WAITLIST_VACANCY',
  'CAMPAIGN',
  'RETENTION_SUGGESTION',
  'CUSTOM',
])

const notificationChannelEnum = z.enum(['WHATSAPP', 'SMS', 'EMAIL'])
const notificationStatusEnum = z.enum(['PENDING', 'SENT', 'FAILED', 'READ'])

const sendNotificationBodySchema = z.object({
  type: notificationTypeEnum,
  channel: notificationChannelEnum,
  recipient: z.string().min(1).max(255),
  content: z.string().min(1),
  subject: z.string().optional(),          // EMAIL only
  htmlContent: z.string().optional(),      // EMAIL only
  patientId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
})

const listQuerySchema = paginationSchema.extend({
  status: notificationStatusEnum.optional(),
  type: notificationTypeEnum.optional(),
  channel: notificationChannelEnum.optional(),
  patientId: uuidSchema.optional(),
  appointmentId: uuidSchema.optional(),
})

export const notificationRoutes: FastifyPluginAsync = async (app) => {
  // ─── GET / ────────────────────────────────────────────────
  app.get(
    '/',
    { preHandler: [requireAuth, requireRoles('GESTOR', 'RECEPCAO')] },
    async (request, reply) => {
      const query = listQuerySchema.parse(request.query)
      const repo = new PrismaNotificationRepository(request.tenantPrisma!)

      const result = await new ListNotificationsUseCase(repo).execute(query)

      return reply.status(200).send({
        success: true,
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      })
    },
  )

  // ─── POST / ───────────────────────────────────────────────
  app.post(
    '/',
    { preHandler: [requireAuth, requireRoles('GESTOR', 'RECEPCAO')] },
    async (request, reply) => {
      const body = sendNotificationBodySchema.parse(request.body)
      const repo = new PrismaNotificationRepository(request.tenantPrisma!)

      const notification = await new SendNotificationUseCase(repo).execute({
        type: body.type,
        channel: body.channel,
        recipient: body.recipient,
        content: body.content,
        subject: body.subject,
        htmlContent: body.htmlContent,
        patientId: body.patientId,
        userId: request.currentUser?.sub,
        appointmentId: body.appointmentId,
      })

      return reply.status(201).send({ success: true, data: notification })
    },
  )

  // ─── POST /:id/retry ──────────────────────────────────────
  app.post(
    '/:id/retry',
    { preHandler: [requireAuth, requireRoles('GESTOR')] },
    async (request, reply) => {
      const params = request.params as Record<string, string>
      const id = uuidSchema.parse(params['id'])
      const repo = new PrismaNotificationRepository(request.tenantPrisma!)

      const notification = await new RetryNotificationUseCase(repo).execute(id)

      return reply.status(200).send({ success: true, data: notification })
    },
  )

  // ─── PATCH /:id/read ──────────────────────────────────────
  app.patch(
    '/:id/read',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const params = request.params as Record<string, string>
      const id = uuidSchema.parse(params['id'])
      const repo = new PrismaNotificationRepository(request.tenantPrisma!)

      const notification = await repo.markRead(id)

      return reply.status(200).send({ success: true, data: notification })
    },
  )
}
