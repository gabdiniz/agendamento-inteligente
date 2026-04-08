// ─── Base application error ───────────────────────────────────────────────
//
// Todos os erros de domínio e aplicação estendem AppError.
// O errorHandler do Fastify usa `statusCode` para responder corretamente.
// ─────────────────────────────────────────────────────────────────────────

export class AppError extends Error {
  public readonly statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    Error.captureStackTrace(this, this.constructor)
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super(`${resource} não encontrado`, 404)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado') {
    super(message, 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado') {
    super(message, 403)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409)
  }
}

export class UnprocessableError extends AppError {
  constructor(message: string) {
    super(message, 422)
  }
}
