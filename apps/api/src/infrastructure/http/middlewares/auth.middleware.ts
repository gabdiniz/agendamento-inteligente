import type { FastifyReply, FastifyRequest } from 'fastify'

import { UnauthorizedError, ForbiddenError } from '../../../domain/errors/app-error.js'
import { TokenService } from '../../services/token.service.js'
import type { JwtPayload } from '../../../domain/services/token.service.js'

// ─── Augment Fastify types ────────────────────────────────────────────────

declare module 'fastify' {
  interface FastifyRequest {
    currentUser: JwtPayload
  }
}

// ─── Token Service (singleton para middleware) ─────────────────────────────

const tokenService = new TokenService()

// ─── Auth Hook ────────────────────────────────────────────────────────────
//
// Verifica o JWT no header Authorization: Bearer <token>
// e injeta currentUser no request.
// ─────────────────────────────────────────────────────────────────────────

export async function requireAuth(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers['authorization']

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token não fornecido')
  }

  const token = authHeader.slice(7) // remove "Bearer "
  const payload = tokenService.verifyAccessToken(token)

  // Garante que o token pertence ao tenant da rota
  if (request.tenantId && payload.tenantId !== request.tenantId) {
    throw new ForbiddenError('Token não pertence a este tenant')
  }

  request.currentUser = payload
}

// ─── Role Guard ──────────────────────────────────────────────────────────
//
// Fábrica de hooks que verificam se o usuário tem pelo menos uma
// das roles exigidas.
// ─────────────────────────────────────────────────────────────────────────

export function requireRoles(...allowedRoles: string[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    // requireAuth deve ter rodado antes
    if (!request.currentUser) {
      throw new UnauthorizedError('Não autenticado')
    }

    const hasRole = request.currentUser.roles.some((role) =>
      allowedRoles.includes(role),
    )

    if (!hasRole) {
      throw new ForbiddenError(
        `Acesso restrito. Roles necessárias: ${allowedRoles.join(', ')}`,
      )
    }
  }
}
