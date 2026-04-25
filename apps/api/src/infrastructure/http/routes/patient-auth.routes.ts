import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { PatientLoginUseCase } from '../../../application/use-cases/patient-auth/login.use-case.js'
import { PatientRefreshTokenUseCase } from '../../../application/use-cases/patient-auth/refresh-token.use-case.js'
import { PatientLogoutUseCase } from '../../../application/use-cases/patient-auth/logout.use-case.js'
import { PatientForgotPasswordUseCase } from '../../../application/use-cases/patient-auth/forgot-password.use-case.js'
import { PatientResetPasswordUseCase } from '../../../application/use-cases/patient-auth/reset-password.use-case.js'
import { PatientChangePasswordUseCase } from '../../../application/use-cases/patient-auth/change-password.use-case.js'

import { PrismaPatientRepository } from '../../database/repositories/prisma-patient.repository.js'
import { PrismaPatientRefreshTokenRepository } from '../../database/repositories/prisma-patient-refresh-token.repository.js'
import { HashService } from '../../services/hash.service.js'
import { TokenService } from '../../services/token.service.js'
import { EmailAdapter } from '../../notifications/channels/email.adapter.js'

import { prisma } from '@myagendix/database'
import { requirePatientAuth } from '../middlewares/patient-auth.middleware.js'

// ─── Singletons ───────────────────────────────────────────────────────────────

const hashService  = new HashService()
const tokenService = new TokenService()
const emailAdapter = new EmailAdapter()

// ─── Helper: base URL do frontend ────────────────────────────────────────────

function getFrontendBaseUrl(request: { headers: Record<string, string | string[] | undefined> }): string {
  if (process.env['APP_URL']) return process.env['APP_URL'].replace(/\/$/, '')
  const origin = request.headers['origin']
  if (origin && typeof origin === 'string') return origin.replace(/\/$/, '')
  const host  = request.headers['host']
  const proto = request.headers['x-forwarded-proto'] ?? 'http'
  return `${proto}://${host}`
}

// ─── Schemas de validação ─────────────────────────────────────────────────────

const loginSchema = z.object({
  email:    z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token é obrigatório'),
})

const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
})

const resetPasswordSchema = z.object({
  token:       z.string().min(1, 'Token é obrigatório'),
  newPassword: z.string().min(8, 'A nova senha deve ter pelo menos 8 caracteres'),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword:     z.string().min(8, 'A nova senha deve ter pelo menos 8 caracteres'),
})

// ─── Patient Auth Routes ──────────────────────────────────────────────────────
//
// Registradas dentro do scope /t/:slug/ (tenant já resolvido pelo plugin).
//
// POST /t/:slug/patient-auth/login
// POST /t/:slug/patient-auth/refresh
// POST /t/:slug/patient-auth/logout        (requer auth paciente)
// GET  /t/:slug/patient-auth/me            (requer auth paciente)
// POST /t/:slug/patient-auth/forgot-password
// POST /t/:slug/patient-auth/reset-password
// PATCH /t/:slug/patient-auth/password     (requer auth paciente)
// ─────────────────────────────────────────────────────────────────────────────

export const patientAuthRoutes: FastifyPluginAsync = async (app) => {

  // ─── POST /login ──────────────────────────────────────────────────────────
  app.post('/login', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '15 minutes',
        errorResponseBuilder: () => ({
          success: false,
          error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
        }),
      },
    },
  }, async (request, reply) => {
    const body = loginSchema.parse(request.body)

    const patientRepo      = new PrismaPatientRepository(request.tenantPrisma!)
    const refreshTokenRepo = new PrismaPatientRefreshTokenRepository(request.tenantPrisma!)

    const useCase = new PatientLoginUseCase(
      patientRepo,
      refreshTokenRepo,
      hashService,
      tokenService,
    )

    const result = await useCase.execute({
      email:      body.email,
      password:   body.password,
      tenantId:   request.tenantId,
      tenantSlug: request.tenantSlug,
    })

    return reply.status(200).send({ success: true, data: result })
  })

  // ─── POST /refresh ────────────────────────────────────────────────────────
  app.post('/refresh', async (request, reply) => {
    const body = refreshSchema.parse(request.body)

    const patientRepo      = new PrismaPatientRepository(request.tenantPrisma!)
    const refreshTokenRepo = new PrismaPatientRefreshTokenRepository(request.tenantPrisma!)

    const useCase = new PatientRefreshTokenUseCase(
      patientRepo,
      refreshTokenRepo,
      hashService,
      tokenService,
    )

    const result = await useCase.execute({
      refreshToken: body.refreshToken,
      tenantId:     request.tenantId,
      tenantSlug:   request.tenantSlug,
    })

    return reply.status(200).send({ success: true, data: result })
  })

  // ─── POST /logout ─────────────────────────────────────────────────────────
  app.post('/logout', { preHandler: [requirePatientAuth] }, async (request, reply) => {
    const body = refreshSchema.parse(request.body)

    const refreshTokenRepo = new PrismaPatientRefreshTokenRepository(request.tenantPrisma!)
    const useCase = new PatientLogoutUseCase(refreshTokenRepo, hashService)

    await useCase.execute({ refreshToken: body.refreshToken })

    return reply.status(200).send({ success: true, message: 'Logout realizado com sucesso' })
  })

  // ─── GET /me ──────────────────────────────────────────────────────────────
  app.get('/me', { preHandler: [requirePatientAuth] }, async (request, reply) => {
    const patientRepo = new PrismaPatientRepository(request.tenantPrisma!)
    const patient = await patientRepo.findById(request.currentPatient.sub)

    if (!patient || !patient.isActive) {
      return reply.status(401).send({ success: false, error: 'Paciente não encontrado ou desativado' })
    }

    // Busca logo da clínica para exibir no portal
    const tenant = await prisma.tenant.findUnique({
      where:  { id: request.tenantId },
      select: { name: true, logoUrl: true },
    })

    return reply.status(200).send({
      success: true,
      data: {
        id:          patient.id,
        name:        patient.name,
        email:       patient.email,
        phone:       patient.phone,
        birthDate:   patient.birthDate,
        gender:      patient.gender,
        city:        patient.city,
        tenantName:  tenant?.name ?? null,
        tenantLogoUrl: tenant?.logoUrl ?? null,
      },
    })
  })

  // ─── POST /forgot-password ────────────────────────────────────────────────
  // Sempre retorna 200 mesmo que e-mail não exista (evita enumeração)
  app.post('/forgot-password', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '15 minutes',
        errorResponseBuilder: () => ({
          success: false,
          error: 'Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.',
        }),
      },
    },
  }, async (request, reply) => {
    const { email } = forgotPasswordSchema.parse(request.body)

    const patientRepo = new PrismaPatientRepository(request.tenantPrisma!)

    // Busca nome da clínica para personalizar o e-mail
    const tenant = await prisma.tenant.findUnique({
      where:  { id: request.tenantId },
      select: { name: true },
    })

    const useCase = new PatientForgotPasswordUseCase(patientRepo, emailAdapter)

    await useCase.execute({
      email,
      tenantSlug: request.tenantSlug,
      tenantName: tenant?.name ?? 'MyAgendix',
      baseUrl:    getFrontendBaseUrl(request as any),
    })

    return reply.status(200).send({
      success: true,
      message: 'Se este e-mail estiver cadastrado, você receberá um link para redefinir a senha.',
    })
  })

  // ─── POST /reset-password ─────────────────────────────────────────────────
  app.post('/reset-password', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '15 minutes',
        errorResponseBuilder: () => ({
          success: false,
          error: 'Muitas tentativas. Aguarde 15 minutos.',
        }),
      },
    },
  }, async (request, reply) => {
    const body = resetPasswordSchema.parse(request.body)

    const patientRepo      = new PrismaPatientRepository(request.tenantPrisma!)
    const refreshTokenRepo = new PrismaPatientRefreshTokenRepository(request.tenantPrisma!)

    const useCase = new PatientResetPasswordUseCase(
      patientRepo,
      refreshTokenRepo,
      hashService,
    )

    await useCase.execute({ token: body.token, newPassword: body.newPassword })

    return reply.status(200).send({
      success: true,
      message: 'Senha redefinida com sucesso. Faça login com sua nova senha.',
    })
  })

  // ─── PATCH /password ──────────────────────────────────────────────────────
  app.patch('/password', { preHandler: [requirePatientAuth] }, async (request, reply) => {
    const body = changePasswordSchema.parse(request.body)

    const patientRepo = new PrismaPatientRepository(request.tenantPrisma!)

    const useCase = new PatientChangePasswordUseCase(patientRepo, hashService)

    await useCase.execute({
      patientId:       request.currentPatient.sub,
      currentPassword: body.currentPassword,
      newPassword:     body.newPassword,
    })

    return reply.status(200).send({ success: true, message: 'Senha alterada com sucesso' })
  })
}
