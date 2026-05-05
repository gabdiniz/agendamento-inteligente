import type { FastifyReply, FastifyRequest } from 'fastify'

import { UnauthorizedError, ForbiddenError } from '../../../domain/errors/app-error.js'
import { TokenService } from '../../services/token.service.js'
import type { PatientJwtPayload } from '../../../domain/services/token.service.js'

// ─── Augment Fastify types ────────────────────────────────────────────────

declare module 'fastify' {
  interface FastifyRequest {
    currentPatient: PatientJwtPayload
  }
}

// ─── Token Service (singleton para middleware) ─────────────────────────────

const tokenService = new TokenService()

// ─── Patient Auth Hook ────────────────────────────────────────────────────
//
// Verifica o JWT no header Authorization: Bearer <token>
// e injeta currentPatient no request.
//
// Este middleware rejeita tokens de staff (role != 'PATIENT') e vice-versa.
// ─────────────────────────────────────────────────────────────────────────

export async function requirePatientAuth(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers['authorization']

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token não fornecido')
  }

  const token = authHeader.slice(7)
  const payload = tokenService.verifyPatientAccessToken(token)

  // Garante que o token pertence ao tenant da rota
  if (request.tenantId && payload.tenantId !== request.tenantId) {
    throw new ForbiddenError('Token não pertence a este tenant')
  }

  request.currentPatient = payload
}
