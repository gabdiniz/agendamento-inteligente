import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

export function errorHandler(
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply,
): void {
  // ─── Zod validation errors ────────────────────────────────────────────
  if (error instanceof ZodError) {
    const details: Record<string, string[]> = {}
    for (const issue of error.issues) {
      const path = issue.path.join('.')
      details[path] = [...(details[path] ?? []), issue.message]
    }

    reply.status(422).send({
      success: false,
      error: 'Dados inválidos',
      details,
    })
    return
  }

  // ─── Domain / application errors ─────────────────────────────────────
  if (error.statusCode) {
    reply.status(error.statusCode).send({
      success: false,
      error: error.message,
    })
    return
  }

  // ─── Unexpected errors ────────────────────────────────────────────────
  console.error('[Unhandled Error]', error)
  reply.status(500).send({
    success: false,
    error: 'Erro interno do servidor',
  })
}
