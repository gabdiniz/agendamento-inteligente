import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { requireAuth } from '../middlewares/auth.middleware.js'
import { requireRoles } from '../middlewares/auth.middleware.js'

import { GetClinicPatientConfigUseCase } from '../../../application/use-cases/patient-portal/get-clinic-patient-config.use-case.js'
import { UpsertClinicPatientConfigUseCase } from '../../../application/use-cases/patient-portal/upsert-clinic-patient-config.use-case.js'

// ─── Clinic Patient Config Routes ─────────────────────────────────────────────
//
// Rotas para o gestor da clínica configurar as regras do portal do paciente.
// Apenas usuários autenticados com role GESTOR têm acesso.
// Prefixo: /t/:slug/clinic/patient-config
//
// GET /     → lê a configuração atual (ou defaults se ainda não configurado)
// PUT /     → cria ou atualiza a configuração
// ─────────────────────────────────────────────────────────────────────────────

const upsertConfigSchema = z.object({
  cancellationAllowed:           z.boolean(),
  cancellationMinHoursInAdvance: z.number().int().min(0).max(168), // 0 a 7 dias
  cancellationAllowedStatuses:   z.array(
    z.enum(['SCHEDULED', 'PATIENT_PRESENT', 'IN_PROGRESS', 'COMPLETED', 'CANCELED']),
  ).min(0),
})

export const clinicPatientConfigRoutes: FastifyPluginAsync = async (app) => {

  // Todas as rotas exigem auth de staff + role GESTOR
  app.addHook('preHandler', requireAuth)
  app.addHook('preHandler', requireRoles('GESTOR', 'ADMIN'))

  // ─── GET / ────────────────────────────────────────────────────────────────
  app.get('/', async (request, reply) => {
    const config = await new GetClinicPatientConfigUseCase(request.tenantPrisma!).execute()
    return reply.status(200).send({ success: true, data: config })
  })

  // ─── PUT / ───────────────────────────────────────────────────────────────
  app.put('/', async (request, reply) => {
    const body = upsertConfigSchema.parse(request.body)

    const config = await new UpsertClinicPatientConfigUseCase(request.tenantPrisma!).execute({
      cancellationAllowed:           body.cancellationAllowed,
      cancellationMinHoursInAdvance: body.cancellationMinHoursInAdvance,
      cancellationAllowedStatuses:   body.cancellationAllowedStatuses,
    })

    return reply.status(200).send({ success: true, data: config })
  })
}
