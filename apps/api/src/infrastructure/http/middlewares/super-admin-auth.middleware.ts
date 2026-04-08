import type { FastifyReply, FastifyRequest } from 'fastify'

import { UnauthorizedError } from '../../../domain/errors/app-error.js'
import { TokenService } from '../../services/token.service.js'
import type { SuperAdminJwtPayload } from '../../../domain/services/token.service.js'

// ─── Augment Fastify types ────────────────────────────────────────────────

declare module 'fastify' {
  interface FastifyRequest {
    currentSuperAdmin: SuperAdminJwtPayload
  }
}

// ─── Token Service (singleton para middleware) ─────────────────────────────

const tokenService = new TokenService()

// ─── Super Admin Auth Hook ──────────────────────────────────────────────────
//
// Verifica o JWT no header Authorization: Bearer <token>.
// Garante que o token tem scope 'super-admin' (não é token de tenant).
// Injeta currentSuperAdmin no request.
// ─────────────────────────────────────────────────────────────────────────

export async function requireSuperAdmin(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers['authorization']

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token não fornecido')
  }

  const token = authHeader.slice(7) // remove "Bearer "

  // verifySuperAdminAccessToken valida assinatura + verifica scope === 'super-admin'
  const payload = tokenService.verifySuperAdminAccessToken(token)

  request.currentSuperAdmin = payload
}
