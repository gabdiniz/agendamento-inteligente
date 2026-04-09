import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'

import tenantPlugin from './middlewares/tenant.middleware.js'
import { errorHandler } from './middlewares/error.middleware.js'
import { authRoutes } from './routes/auth.routes.js'
import { superAdminAuthRoutes } from './routes/super-admin-auth.routes.js'
import { tenantManagementRoutes } from './routes/tenant-management.routes.js'
import { professionalRoutes } from './routes/professional.routes.js'
import { procedureRoutes } from './routes/procedure.routes.js'
import { workScheduleRoutes } from './routes/work-schedule.routes.js'
import { patientRoutes } from './routes/patient.routes.js'
import { appointmentRoutes } from './routes/appointment.routes.js'

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

  // ─── Health check (sem tenant, sem auth) ─────────────────────
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }))

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
      await tenantScope.register(patientRoutes, { prefix: '/patients' })
      await tenantScope.register(appointmentRoutes, { prefix: '/appointments' })

      // TODO (próximos módulos):
      // await tenantScope.register(waitlistRoutes, { prefix: '/waitlist' })
      // await tenantScope.register(notificationRoutes, { prefix: '/notifications' })
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

      adminScope.get('/health', async () => ({
        status: 'ok',
        scope: 'super-admin',
      }))
    },
    { prefix: '/super-admin' },
  )

  // ─── Error handler ───────────────────────────────────────────
  app.setErrorHandler(errorHandler)

  return app
}
