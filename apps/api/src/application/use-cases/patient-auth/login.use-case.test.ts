// ─── PatientLoginUseCase — testes unitários ───────────────────────────────────
//
// Cobre os caminhos críticos sem tocar no banco de dados.
// Todas as dependências são mocks simples baseados nas interfaces de domínio.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PatientLoginUseCase } from './login.use-case.js'
import { UnauthorizedError } from '../../../domain/errors/app-error.js'
import type { IPatientRepository, PatientAuthRecord } from '../../../domain/repositories/patient.repository.js'
import type { IPatientRefreshTokenRepository } from '../../../domain/repositories/patient-refresh-token.repository.js'
import type { IHashService } from '../../../domain/services/hash.service.js'
import type { ITokenService, TokenPair } from '../../../domain/services/token.service.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_PATIENT: PatientAuthRecord = {
  id:                      'patient-1',
  name:                    'Ana Lima',
  phone:                   '11999990001',
  email:                   'ana@example.com',
  birthDate:               null,
  gender:                  null,
  city:                    null,
  preferredContactChannel: null,
  marketingOptIn:          false,
  notes:                   null,
  source:                  'PUBLIC_PAGE',
  isActive:                true,
  createdAt:               new Date(),
  updatedAt:               new Date(),
  passwordHash:            '$2b$10$hashedpassword',
  passwordResetToken:      null,
  passwordResetExpiresAt:  null,
}

const VALID_INPUT = {
  email:       'ana@example.com',
  password:    'Senha@123',
  tenantId:    'tenant-abc',
  tenantSlug:  'minha-clinica',
}

const TOKEN_PAIR: TokenPair = {
  accessToken:  'access.jwt.token',
  refreshToken: 'refresh-raw-token',
}

// ─── Builders de mock ─────────────────────────────────────────────────────────

function makePatientRepo(overrides?: Partial<IPatientRepository>): IPatientRepository {
  return {
    create:                    vi.fn(),
    findById:                  vi.fn(),
    findByPhone:               vi.fn(),
    list:                      vi.fn(),
    update:                    vi.fn(),
    setActive:                 vi.fn(),
    findByIdWithAuth:          vi.fn(),
    findByEmailWithAuth:       vi.fn().mockResolvedValue(BASE_PATIENT),
    findByPasswordResetToken:  vi.fn(),
    updatePasswordHash:        vi.fn(),
    savePasswordResetToken:    vi.fn(),
    clearPasswordResetToken:   vi.fn(),
    updateLastLogin:           vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function makeRefreshTokenRepo(overrides?: Partial<IPatientRefreshTokenRepository>): IPatientRefreshTokenRepository {
  return {
    create:                vi.fn().mockResolvedValue({
      id: 'rt-1', patientId: 'patient-1', tokenHash: 'hashed-rt',
      expiresAt: new Date(), revokedAt: null, createdAt: new Date(),
    }),
    findByTokenHash:       vi.fn(),
    revoke:                vi.fn(),
    revokeAllByPatientId:  vi.fn(),
    ...overrides,
  }
}

function makeHashService(overrides?: Partial<IHashService>): IHashService {
  return {
    hashPassword:    vi.fn(),
    comparePassword: vi.fn().mockResolvedValue(true),
    hashToken:       vi.fn().mockReturnValue('hashed-refresh-token'),
    ...overrides,
  }
}

function makeTokenService(overrides?: Partial<ITokenService>): ITokenService {
  return {
    generateTokenPair:            vi.fn(),
    verifyAccessToken:            vi.fn(),
    generateSuperAdminTokenPair:  vi.fn(),
    verifySuperAdminAccessToken:  vi.fn(),
    generatePatientTokenPair:     vi.fn().mockReturnValue(TOKEN_PAIR),
    verifyPatientAccessToken:     vi.fn(),
    generateRefreshToken:         vi.fn(),
    refreshExpiresInMs:           7 * 24 * 60 * 60 * 1000,  // 7 dias
    ...overrides,
  }
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('PatientLoginUseCase', () => {
  let patientRepo:      IPatientRepository
  let refreshTokenRepo: IPatientRefreshTokenRepository
  let hashService:      IHashService
  let tokenService:     ITokenService
  let useCase:          PatientLoginUseCase

  beforeEach(() => {
    patientRepo      = makePatientRepo()
    refreshTokenRepo = makeRefreshTokenRepo()
    hashService      = makeHashService()
    tokenService     = makeTokenService()
    useCase          = new PatientLoginUseCase(patientRepo, refreshTokenRepo, hashService, tokenService)
  })

  // ── Caminho feliz ─────────────────────────────────────────────────────────

  it('retorna accessToken, refreshToken e dados do paciente em login bem-sucedido', async () => {
    const result = await useCase.execute(VALID_INPUT)

    expect(result.accessToken).toBe(TOKEN_PAIR.accessToken)
    expect(result.refreshToken).toBe(TOKEN_PAIR.refreshToken)
    expect(result.patient).toMatchObject({
      id:    BASE_PATIENT.id,
      name:  BASE_PATIENT.name,
      email: BASE_PATIENT.email,
    })
  })

  it('persiste refresh token e atualiza lastLoginAt em paralelo', async () => {
    await useCase.execute(VALID_INPUT)

    expect(refreshTokenRepo.create).toHaveBeenCalledOnce()
    expect(patientRepo.updateLastLogin).toHaveBeenCalledWith(BASE_PATIENT.id)
  })

  it('gera JWT com payload correto (tenantId, tenantSlug, role PATIENT)', async () => {
    await useCase.execute(VALID_INPUT)

    expect(tokenService.generatePatientTokenPair).toHaveBeenCalledWith({
      sub:        BASE_PATIENT.id,
      tenantId:   VALID_INPUT.tenantId,
      tenantSlug: VALID_INPUT.tenantSlug,
      role:       'PATIENT',
    })
  })

  // ── E-mail não encontrado ─────────────────────────────────────────────────

  it('lança UnauthorizedError quando e-mail não existe (sem enumerar)', async () => {
    patientRepo = makePatientRepo({
      findByEmailWithAuth: vi.fn().mockResolvedValue(null),
    })
    useCase = new PatientLoginUseCase(patientRepo, refreshTokenRepo, hashService, tokenService)

    await expect(useCase.execute(VALID_INPUT)).rejects.toThrow(UnauthorizedError)
  })

  // ── Conta inativa ─────────────────────────────────────────────────────────

  it('lança UnauthorizedError quando a conta está inativa (isActive = false)', async () => {
    patientRepo = makePatientRepo({
      findByEmailWithAuth: vi.fn().mockResolvedValue({ ...BASE_PATIENT, isActive: false }),
    })
    useCase = new PatientLoginUseCase(patientRepo, refreshTokenRepo, hashService, tokenService)

    await expect(useCase.execute(VALID_INPUT)).rejects.toThrow(UnauthorizedError)
  })

  // ── Conta sem senha cadastrada ────────────────────────────────────────────

  it('lança UnauthorizedError quando paciente nunca criou uma senha (passwordHash null)', async () => {
    patientRepo = makePatientRepo({
      findByEmailWithAuth: vi.fn().mockResolvedValue({ ...BASE_PATIENT, passwordHash: null }),
    })
    useCase = new PatientLoginUseCase(patientRepo, refreshTokenRepo, hashService, tokenService)

    await expect(useCase.execute(VALID_INPUT)).rejects.toThrow(UnauthorizedError)
  })

  // ── Senha incorreta ───────────────────────────────────────────────────────

  it('lança UnauthorizedError quando a senha não bate com o hash', async () => {
    hashService = makeHashService({
      comparePassword: vi.fn().mockResolvedValue(false),
    })
    useCase = new PatientLoginUseCase(patientRepo, refreshTokenRepo, hashService, tokenService)

    await expect(useCase.execute(VALID_INPUT)).rejects.toThrow(UnauthorizedError)
  })

  // ── Mensagem genérica (anti-enumeração) ───────────────────────────────────

  it('usa a mesma mensagem de erro independentemente da causa (anti-enumeração)', async () => {
    const scenariosPatches = [
      { findByEmailWithAuth: vi.fn().mockResolvedValue(null) },
      { findByEmailWithAuth: vi.fn().mockResolvedValue({ ...BASE_PATIENT, isActive: false }) },
      { findByEmailWithAuth: vi.fn().mockResolvedValue({ ...BASE_PATIENT, passwordHash: null }) },
    ]

    for (const patch of scenariosPatches) {
      const repo = makePatientRepo(patch)
      const uc   = new PatientLoginUseCase(repo, refreshTokenRepo, hashService, tokenService)
      const err  = await uc.execute(VALID_INPUT).catch((e: unknown) => e)

      expect(err).toBeInstanceOf(UnauthorizedError)
      expect((err as UnauthorizedError).message).toBe('E-mail ou senha inválidos')
    }

    // Senha incorreta também usa a mesma mensagem
    const hashSvc = makeHashService({ comparePassword: vi.fn().mockResolvedValue(false) })
    const uc      = new PatientLoginUseCase(patientRepo, refreshTokenRepo, hashSvc, tokenService)
    const err     = await uc.execute(VALID_INPUT).catch((e: unknown) => e)
    expect((err as UnauthorizedError).message).toBe('E-mail ou senha inválidos')
  })

  // ── Status codes ──────────────────────────────────────────────────────────

  it('UnauthorizedError tem statusCode 401', async () => {
    const repo = makePatientRepo({ findByEmailWithAuth: vi.fn().mockResolvedValue(null) })
    const uc   = new PatientLoginUseCase(repo, refreshTokenRepo, hashService, tokenService)
    const err  = await uc.execute(VALID_INPUT).catch((e: unknown) => e)

    expect((err as UnauthorizedError).statusCode).toBe(401)
  })
})
