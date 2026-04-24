import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { randomBytes, createHash } from 'node:crypto'
import { loginSchema, refreshTokenSchema } from '@myagendix/shared'

import { LoginUseCase } from '../../../application/use-cases/auth/login.use-case.js'
import { RefreshTokenUseCase } from '../../../application/use-cases/auth/refresh-token.use-case.js'
import { LogoutUseCase } from '../../../application/use-cases/auth/logout.use-case.js'

import { PrismaUserRepository } from '../../database/repositories/prisma-user.repository.js'
import { PrismaRefreshTokenRepository } from '../../database/repositories/prisma-refresh-token.repository.js'
import { HashService } from '../../services/hash.service.js'
import { TokenService } from '../../services/token.service.js'
import { EmailAdapter } from '../../notifications/channels/email.adapter.js'

import { prisma } from '@myagendix/database'
import { requireAuth } from '../middlewares/auth.middleware.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Gera token aleatório de 32 bytes em hex e retorna {raw, hash}. */
function generateResetToken() {
  const raw = randomBytes(32).toString('hex')
  const hash = createHash('sha256').update(raw).digest('hex')
  return { raw, hash }
}

/** Retorna a URL base do frontend. Prioridade: APP_URL env → origin header → host header. */
function getFrontendBaseUrl(request: { headers: Record<string, string | string[] | undefined> }): string {
  if (process.env['APP_URL']) return process.env['APP_URL'].replace(/\/$/, '')
  const origin = request.headers['origin']
  if (origin && typeof origin === 'string') return origin.replace(/\/$/, '')
  const host = request.headers['host']
  const proto = request.headers['x-forwarded-proto'] ?? 'http'
  return `${proto}://${host}`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Busca o logoUrl do tenant no schema público. Retorna null se não encontrar. */
async function getTenantLogoUrl(tenantId: string): Promise<string | null> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where:  { id: tenantId },
      select: { logoUrl: true },
    })
    return tenant?.logoUrl ?? null
  } catch {
    return null
  }
}

/**
 * Busca os slugs das features do plano do tenant.
 * Retorna array vazio se o tenant não tem plano atribuído.
 */
async function getTenantFeatures(tenantId: string): Promise<string[]> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where:  { id: tenantId },
      select: {
        plan: {
          select: {
            features: {
              select: { feature: { select: { slug: true } } },
            },
          },
        },
      },
    })
    return tenant?.plan?.features.map((pf) => pf.feature.slug) ?? []
  } catch {
    return []
  }
}

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
  // Rate limit estrito: 10 tentativas a cada 15 min por IP (anti-brute-force)
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

    const userRepo = new PrismaUserRepository(request.tenantPrisma!)
    const refreshTokenRepo = new PrismaRefreshTokenRepository(request.tenantPrisma!)

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

    const [tenantLogoUrl, tenantFeatures] = await Promise.all([
      getTenantLogoUrl(request.tenantId),
      getTenantFeatures(request.tenantId),
    ])

    return reply.status(200).send({
      success: true,
      data: {
        ...result,
        user: { ...result.user, tenantLogoUrl, tenantFeatures },
      },
    })
  })

  // ─── POST /refresh ────────────────────────────────────────
  app.post('/refresh', async (request, reply) => {
    const body = refreshTokenSchema.parse(request.body)

    const userRepo = new PrismaUserRepository(request.tenantPrisma!)
    const refreshTokenRepo = new PrismaRefreshTokenRepository(request.tenantPrisma!)

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

    const refreshTokenRepo = new PrismaRefreshTokenRepository(request.tenantPrisma!)
    const useCase = new LogoutUseCase(refreshTokenRepo, hashService)

    await useCase.execute({ refreshToken: body.refreshToken })

    return reply.status(200).send({
      success: true,
      message: 'Logout realizado com sucesso',
    })
  })

  // ─── GET /me ──────────────────────────────────────────────
  app.get('/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const userRepo = new PrismaUserRepository(request.tenantPrisma!)
    const user = await userRepo.findById(request.currentUser.sub)

    if (!user || !user.isActive) {
      return reply.status(401).send({
        success: false,
        error: 'Usuário não encontrado ou desativado',
      })
    }

    const [tenantLogoUrl, tenantFeatures] = await Promise.all([
      getTenantLogoUrl(request.tenantId),
      getTenantFeatures(request.tenantId),
    ])

    return reply.status(200).send({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        roles: user.roles.map((r) => r.role),
        tenantLogoUrl,
        tenantFeatures,
      },
    })
  })

  // ─── PATCH /password ──────────────────────────────────────
  app.patch('/password', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres'),
    }).parse(request.body)

    const userRepo = new PrismaUserRepository(request.tenantPrisma!)
    const user = await userRepo.findById(request.currentUser.sub)

    if (!user || !user.isActive) {
      return reply.status(401).send({ success: false, error: 'Usuário não encontrado' })
    }

    const match = await hashService.comparePassword(body.currentPassword, user.passwordHash)
    if (!match) {
      return reply.status(422).send({ success: false, error: 'Senha atual incorreta' })
    }

    const newHash = await hashService.hashPassword(body.newPassword)
    await userRepo.updatePassword(user.id, newHash)

    return reply.status(200).send({ success: true, message: 'Senha alterada com sucesso' })
  })

  // ─── POST /forgot-password ────────────────────────────────────
  //
  // Recebe e-mail → cria token de reset → envia e-mail com link.
  // Sempre retorna 200 mesmo que o e-mail não exista (evita enumeração).
  // Rate limit: 5 tentativas por 15 min por IP.
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
    const { email } = z.object({
      email: z.string().email('E-mail inválido'),
    }).parse(request.body)

    const prismaT = request.tenantPrisma!
    const userRepo = new PrismaUserRepository(prismaT)

    // Resposta genérica independente de o usuário existir (anti-enumeração)
    const genericOk = () =>
      reply.status(200).send({
        success: true,
        message: 'Se este e-mail estiver cadastrado, você receberá um link para redefinir a senha.',
      })

    const user = await userRepo.findByEmail(email)
    if (!user || !user.isActive) return genericOk()

    // Invalida tokens anteriores não utilizados para este usuário
    await prismaT.$executeRaw`
      UPDATE password_reset_tokens
      SET "usedAt" = now()
      WHERE "userId" = ${user.id}::uuid
        AND "usedAt" IS NULL
        AND "expiresAt" > now()
    `

    // Gera novo token (1 hora de validade)
    const { raw, hash } = generateResetToken()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await prismaT.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hash,
        expiresAt,
      },
    })

    // Monta link e envia e-mail
    const baseUrl = getFrontendBaseUrl(request as any)
    const resetLink = `${baseUrl}/app/${request.tenantSlug}/reset-password?token=${raw}`

    const emailAdapter = new EmailAdapter()
    await emailAdapter.send({
      to: user.email,
      subject: 'Redefinição de senha — MyAgendix',
      text: [
        `Olá, ${user.name}!`,
        '',
        'Recebemos uma solicitação para redefinir a senha da sua conta.',
        'Clique no link abaixo para criar uma nova senha (válido por 1 hora):',
        '',
        resetLink,
        '',
        'Se você não solicitou isso, ignore este e-mail — sua senha não será alterada.',
      ].join('\n'),
      html: `
        <p>Olá, <strong>${user.name}</strong>!</p>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
        <p>
          <a href="${resetLink}" style="
            display: inline-block;
            padding: 12px 24px;
            background: #4f46e5;
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
          ">Redefinir minha senha</a>
        </p>
        <p style="color: #6b7280; font-size: 13px;">
          Este link expira em <strong>1 hora</strong>.<br/>
          Se você não solicitou isso, ignore este e-mail — sua senha não será alterada.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0" />
        <p style="color: #9ca3af; font-size: 12px;">
          Não consegue clicar? Copie o link:<br/>
          <code style="word-break: break-all;">${resetLink}</code>
        </p>
      `,
    })

    return genericOk()
  })

  // ─── POST /reset-password ─────────────────────────────────────
  //
  // Recebe token + nova senha → valida → atualiza senha → invalida token.
  // Rate limit: 10 tentativas por 15 min por IP.
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
    const { token, newPassword } = z.object({
      token: z.string().min(1, 'Token é obrigatório'),
      newPassword: z.string().min(8, 'A nova senha deve ter pelo menos 8 caracteres'),
    }).parse(request.body)

    const prismaT = request.tenantPrisma!

    // Busca o token pelo hash
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const record = await prismaT.passwordResetToken.findUnique({
      where: { tokenHash },
    })

    if (!record || record.usedAt !== null || record.expiresAt < new Date()) {
      return reply.status(422).send({
        success: false,
        error: 'Link inválido ou expirado. Solicite um novo link de recuperação.',
      })
    }

    // Atualiza senha e invalida token em transação
    const newHash = await hashService.hashPassword(newPassword)

    await prismaT.$transaction([
      prismaT.passwordResetToken.update({
        where: { id: record.id },
        data:  { usedAt: new Date() },
      }),
      prismaT.user.update({
        where: { id: record.userId },
        data:  { passwordHash: newHash },
      }),
      // Revoga todos os refresh tokens do usuário (força novo login)
      prismaT.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data:  { revokedAt: new Date() },
      }),
    ])

    return reply.status(200).send({
      success: true,
      message: 'Senha redefinida com sucesso. Faça login com sua nova senha.',
    })
  })
}
