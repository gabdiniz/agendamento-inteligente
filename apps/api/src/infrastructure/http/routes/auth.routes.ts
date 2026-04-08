import type { FastifyPluginAsync } from 'fastify'
import { loginSchema, refreshTokenSchema } from '@myagendix/shared'

import { LoginUseCase } from '../../../application/use-cases/auth/login.use-case.js'
import { RefreshTokenUseCase } from '../../../application/use-cases/auth/refresh-token.use-case.js'
import { LogoutUseCase } from '../../../application/use-cases/auth/logout.use-case.js'

import { PrismaUserRepository } from '../../database/repositories/prisma-user.repository.js'
import { PrismaRefreshTokenRepository } from '../../database/repositories/prisma-refresh-token.repository.js'
import { HashService } from '../../services/hash.service.js'
import { TokenService } from '../../services/token.service.js'

import { requireAuth } from '../middlewares/auth.middleware.js'

// ─── Serviços (singleton) ────────────────────────────────────────────────

const hashService = new HashService()
const tokenService = new TokenService()

// ─── Auth Routes ─────────────────────────────────────────────────────────
//
// Registradas dentro do scope /t/:slug/ (tenant já resolvido pelo
// tenant plugin quando chega aqui).
//
// POST /t/:slug/auth/login
// POST /t/:slug/auth/refresh
// POST /t/:slug/auth/logout  (requer auth)
// GET  /t/:slug/auth/me      (requer auth)
// ─────────────────────────────────────────────────────────────────────────

export const authRoutes: FastifyPluginAsync = async (app) => {
  // ─── POST /login ──────────────────────────────────────────
  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body)

    const userRepo = new PrismaUserRepository(request.tenantPrisma)
    const refreshTokenRepo = new PrismaRefreshTokenRepository(request.tenantPrisma)

    const useCase = new LoginUseCase(
      userRepo,
      refreshTokenRepo,
      hashService,
      tokenService,
    )

    const result = await useCase.execute({
      email: body.email,
      password: body.password,
      tenantId: request.tenantId,
      tenantSlug: request.tenantSlug,
    })

    return reply.status(200).send({
      success: true,
      data: result,
    })
  })

  // ─── POST /refresh ────────────────────────────────────────
  app.post('/refresh', async (request, reply) => {
    const body = refreshTokenSchema.parse(request.body)

    const userRepo = new PrismaUserRepository(request.tenantPrisma)
    const refreshTokenRepo = new PrismaRefreshTokenRepository(request.tenantPrisma)

    const useCase = new RefreshTokenUseCase(
      userRepo,
      refreshTokenRepo,
      hashService,
      tokenService,
    )

    const result = await useCase.execute({
      refreshToken: body.refreshToken,
      tenantId: request.tenantId,
      tenantSlug: request.tenantSlug,
    })

    return reply.status(200).send({
      success: true,
      data: result,
    })
  })

  // ─── POST /logout ─────────────────────────────────────────
  app.post('/logout', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = refreshTokenSchema.parse(request.body)

    const refreshTokenRepo = new PrismaRefreshTokenRepository(request.tenantPrisma)
    const useCase = new LogoutUseCase(refreshTokenRepo, hashService)

    await useCase.execute({ refreshToken: body.refreshToken })

    return reply.status(200).send({
      success: true,
      message: 'Logout realizado com sucesso',
    })
  })

  // ─── GET /me ──────────────────────────────────────────────
  app.get('/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const userRepo = new PrismaUserRepository(request.tenantPrisma)
    const user = await userRepo.findById(request.currentUser.sub)

    if (!user || !user.isActive) {
      return reply.status(401).send({
        success: false,
        error: 'Usuário não encontrado ou desativado',
      })
    }

    return reply.status(200).send({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        roles: user.roles.map((r) => r.role),
      },
    })
  })
}
