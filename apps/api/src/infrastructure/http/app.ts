import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import { createReadStream } from 'node:fs'
import { join, extname } from 'node:path'

import tenantPlugin from './middlewares/tenant.middleware.js'
import { errorHandler } from './middlewares/error.middleware.js'
import { authRoutes } from './routes/auth.routes.js'
import { superAdminAuthRoutes } from './routes/super-admin-auth.routes.js'
import { tenantManagementRoutes } from './routes/tenant-management.routes.js'
import { uploadRoutes } from './routes/upload.routes.js'
import { professionalRoutes } from './routes/professional.routes.js'
import { procedureRoutes } from './routes/procedure.routes.js'
import { workScheduleRoutes } from './routes/work-schedule.routes.js'
import { scheduleBlockRoutes } from './routes/schedule-block.routes.js'
import { patientRoutes } from './routes/patient.routes.js'
import { appointmentRoutes } from './routes/appointment.routes.js'
import { waitlistRoutes } from './routes/waitlist.routes.js'
import { publicBookingRoutes } from './routes/public-booking.routes.js'
import { notificationRoutes } from './routes/notification.routes.js'
import { userRoutes } from './routes/user.routes.js'
import { whatsappRoutes } from './routes/whatsapp.routes.js'
import { planManagementRoutes } from './routes/plan-management.routes.js'
import { startWhatsappWorker } from '../../application/workers/whatsapp.worker.js'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
    },
  })

  // ─── Global Plugins ─────────────────────────────────────────
  await app.register(helmet)
  await app.register(cors, {
    origin: process.env['APP_URL'] ?? '*',
    credentials: true,
  })
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })
  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5 MB max
  })

  // ─── Health check (sem tenant, sem auth) ─────────────────────
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }))

  // ─── Serving de logos de clínicas (público) ───────────────────
  //
  // Serve arquivos de /uploads/logos/:filename
  // Não requer autenticação — logos são públicos (usados na booking page)
  //
  app.get('/uploads/logos/:filename', async (request, reply) => {
    const { filename } = request.params as { filename: string }

    // Segurança: permite apenas nomes de arquivo simples (sem path traversal)
    if (!/^[\w-]+\.(png|jpg|jpeg|webp|svg|gif)$/i.test(filename)) {
      return reply.status(400).send({ error: 'Nome de arquivo inválido.' })
    }

    const filepath = join(process.cwd(), 'uploads', 'logos', filename)
    const ext = extname(filename).toLowerCase()
    const contentTypeMap: Record<string, string> = {
      '.png':  'image/png',
      '.jpg':  'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.svg':  'image/svg+xml',
      '.gif':  'image/gif',
    }
    const contentType = contentTypeMap[ext] ?? 'application/octet-stream'

    try {
      const stream = createReadStream(filepath)
      reply.header('Content-Type', contentType)
      reply.header('Cache-Control', 'public, max-age=31536000, immutable')
      // Permite que a imagem seja carregada por origens diferentes (ex: app em :5173 buscando API em :3333)
      reply.header('Cross-Origin-Resource-Policy', 'cross-origin')
      return reply.send(stream)
    } catch {
      return reply.status(404).send({ error: 'Logo não encontrada.' })
    }
  })

  // ─── Tenant-scoped routes (/t/:slug/*) ───────────────────────
  //
  // O tenant plugin roda APENAS dentro deste scope.
  // Cada request recebe: request.tenantId, request.tenantSchema,
  // request.tenantPrisma (instância Prisma apontando para o schema).
  //
  await app.register(
    async (tenantScope) => {
      await tenantScope.register(tenantPlugin)
      await tenantScope.register(authRoutes, { prefix: '/auth' })
      await tenantScope.register(professionalRoutes, { prefix: '/professionals' })
      await tenantScope.register(procedureRoutes, { prefix: '/procedures' })
      // Work schedule nested under professional — :professionalId é resolvido pelo Fastify
      await tenantScope.register(workScheduleRoutes, { prefix: '/professionals/:professionalId/schedule' })
      await tenantScope.register(scheduleBlockRoutes, { prefix: '/professionals/:professionalId/schedule/blocks' })
      await tenantScope.register(patientRoutes, { prefix: '/patients' })
      await tenantScope.register(appointmentRoutes, { prefix: '/appointments' })
      await tenantScope.register(waitlistRoutes, { prefix: '/waitlist' })
      await tenantScope.register(publicBookingRoutes, { prefix: '/public' })
      await tenantScope.register(notificationRoutes, { prefix: '/notifications' })
      await tenantScope.register(userRoutes, { prefix: '/users' })
      await tenantScope.register(whatsappRoutes, { prefix: '/whatsapp' })
    },
    { prefix: '/t/:slug' },
  )

  // ─── Super Admin routes (/super-admin/*) ─────────────────────
  //
  // Sem contexto de tenant. Operações da plataforma:
  // gerenciar tenants, planos, assinaturas.
  //
  await app.register(
    async (adminScope) => {
      await adminScope.register(superAdminAuthRoutes, { prefix: '/auth' })
      await adminScope.register(tenantManagementRoutes, { prefix: '/tenants' })
      await adminScope.register(planManagementRoutes, { prefix: '' })
      await adminScope.register(uploadRoutes, { prefix: '/upload' })

      adminScope.get('/health', async () => ({
        status: 'ok',
        scope: 'super-admin',
      }))
    },
    { prefix: '/super-admin' },
  )

  // ─── Error handler ───────────────────────────────────────────
  app.setErrorHandler(errorHandler)

  // ─── WhatsApp Worker ─────────────────────────────────────────
  // Inicia o polling loop após o servidor estar pronto.
  app.addHook('onReady', () => {
    startWhatsappWorker()
  })

  return app
}
