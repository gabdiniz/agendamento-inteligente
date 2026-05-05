import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '@myagendix/database'
import { loginSchema, refreshTokenSchema } from '@myagendix/shared'

import { SuperAdminLoginUseCase } from '../../../application/use-cases/super-admin-auth/login.use-case.js'
import { SuperAdminRefreshTokenUseCase } from '../../../application/use-cases/super-admin-auth/refresh-token.use-case.js'
import { SuperAdminLogoutUseCase } from '../../../application/use-cases/super-admin-auth/logout.use-case.js'

import { PrismaSuperAdminRepository } from '../../database/repositories/prisma-super-admin.repository.js'
import { PrismaSuperAdminRefreshTokenRepository } from '../../database/repositories/prisma-super-admin-refresh-token.repository.js'
import { HashService } from '../../services/hash.service.js'
import { TokenService } from '../../services/token.service.js'

import { requireSuperAdmin } from '../middlewares/super-admin-auth.middleware.js'

// ─── Serviços (singleton) ────────────────────────────────────────────────

const hashService = new HashService()
const tokenService = new TokenService()

// ─── Repositórios (singleton — operam no schema public) ─────────────────

const superAdminRepo = new PrismaSuperAdminRepository(prisma)
const refreshTokenRepo = new PrismaSuperAdminRefreshTokenRepository(prisma)

// ─── Super Admin Auth Routes ────────────────────────────────────────────
//
// Registradas dentro do scope /super-admin/ (sem tenant).
//
// POST /super-admin/auth/login
// POST /super-admin/auth/refresh
// POST /super-admin/auth/logout  (requer super admin auth)
// GET  /super-admin/auth/me      (requer super admin auth)
// ─────────────────────────────────────────────────────────────────────────

export const superAdminAuthRoutes: FastifyPluginAsync = async (app) => {
  // ─── POST /login ──────────────────────────────────────────
  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body)

    const useCase = new SuperAdminLoginUseCase(
      superAdminRepo,
      refreshTokenRepo,
      hashService,
      tokenService,
    )

    const result = await useCase.execute({
      email: body.email,
      password: body.password,
    })

    return reply.status(200).send({
      success: true,
      data: result,
    })
  })

  // ─── POST /refresh ────────────────────────────────────────
  app.post('/refresh', async (request, reply) => {
    const body = refreshTokenSchema.parse(request.body)

    const useCase = new SuperAdminRefreshTokenUseCase(
      superAdminRepo,
      refreshTokenRepo,
      hashService,
      tokenService,
    )

    const result = await useCase.execute({
      refreshToken: body.refreshToken,
    })

    return reply.status(200).send({
      success: true,
      data: result,
    })
  })

  // ─── POST /logout ─────────────────────────────────────────
  app.post(
    '/logout',
    { preHandler: [requireSuperAdmin] },
    async (request, reply) => {
      const body = refreshTokenSchema.parse(request.body)

      const useCase = new SuperAdminLogoutUseCase(refreshTokenRepo, hashService)

      await useCase.execute({ refreshToken: body.refreshToken })

      return reply.status(200).send({
        success: true,
        message: 'Logout realizado com sucesso',
      })
    },
  )

  // ─── GET /me ──────────────────────────────────────────────
  app.get(
    '/me',
    { preHandler: [requireSuperAdmin] },
    async (request, reply) => {
      const admin = await superAdminRepo.findById(
        request.currentSuperAdmin.sub,
      )

      if (!admin || !admin.isActive) {
        return reply.status(401).send({
          success: false,
          error: 'Admin não encontrado ou desativado',
        })
      }

      return reply.status(200).send({
        success: true,
        data: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          scope: 'super-admin',
        },
      })
    },
  )
}
