import { randomBytes } from 'node:crypto'
import jwt from 'jsonwebtoken'

import { UnauthorizedError } from '../../domain/errors/app-error.js'
import type {
  ITokenService,
  JwtPayload,
  SuperAdminJwtPayload,
  TokenPair,
} from '../../domain/services/token.service.js'

// ─── Duração dos tokens em segundos ──────────────────────────────────────

function parseExpiresIn(value: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value)
  if (!match) return 900 // fallback: 15 minutos

  const num = Number(match[1])
  const unit = match[2]

  switch (unit) {
    case 's': return num
    case 'm': return num * 60
    case 'h': return num * 3600
    case 'd': return num * 86400
    default: return 900
  }
}

export class TokenService implements ITokenService {
  private readonly accessSecret: string
  private readonly accessExpiresInSec: number
  readonly refreshExpiresInMs: number

  constructor() {
    this.accessSecret = process.env['JWT_SECRET'] ?? 'dev-secret'
    this.accessExpiresInSec = parseExpiresIn(process.env['JWT_EXPIRES_IN'] ?? '15m')
    // refreshExpiresInMs é exposto para os use cases calcularem o expiresAt no DB
    this.refreshExpiresInMs = parseExpiresIn(process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d') * 1000
  }

  // ─── Tenant ─────────────────────────────────────────────────────────────

  generateTokenPair(payload: JwtPayload): TokenPair {
    const accessToken = jwt.sign(
      {
        sub: payload.sub,
        tenantId: payload.tenantId,
        tenantSlug: payload.tenantSlug,
        roles: payload.roles,
      },
      this.accessSecret,
      { expiresIn: this.accessExpiresInSec },
    )

    const refreshToken = this.generateRefreshToken()

    return { accessToken, refreshToken }
  }

  verifyAccessToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.accessSecret) as jwt.JwtPayload & JwtPayload
      return {
        sub: decoded['sub'] as string,
        tenantId: decoded['tenantId'] as string,
        tenantSlug: decoded['tenantSlug'] as string,
        roles: decoded['roles'] as string[],
      }
    } catch {
      throw new UnauthorizedError('Token inválido ou expirado')
    }
  }

  // ─── Super Admin ────────────────────────────────────────────────────────

  generateSuperAdminTokenPair(payload: SuperAdminJwtPayload): TokenPair {
    const accessToken = jwt.sign(
      {
        sub: payload.sub,
        scope: 'super-admin',
      },
      this.accessSecret,
      { expiresIn: this.accessExpiresInSec },
    )

    const refreshToken = this.generateRefreshToken()

    return { accessToken, refreshToken }
  }

  verifySuperAdminAccessToken(token: string): SuperAdminJwtPayload {
    try {
      const decoded = jwt.verify(token, this.accessSecret) as jwt.JwtPayload

      // Garante que é um token de super admin (não de tenant)
      if (decoded['scope'] !== 'super-admin') {
        throw new UnauthorizedError('Token não é de super admin')
      }

      return {
        sub: decoded['sub'] as string,
        scope: 'super-admin',
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err
      throw new UnauthorizedError('Token inválido ou expirado')
    }
  }

  // ─── Shared ─────────────────────────────────────────────────────────────

  generateRefreshToken(): string {
    return randomBytes(64).toString('hex')
  }
}
