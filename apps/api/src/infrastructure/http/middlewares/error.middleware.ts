import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

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

  // ─── Prisma known errors ──────────────────────────────────────────────
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2025: Record not found (update/delete em ID inexistente)
    if (error.code === 'P2025') {
      reply.status(404).send({
        success: false,
        error: 'Recurso não encontrado',
      })
      return
    }

    // P2002: Unique constraint violation
    if (error.code === 'P2002') {
      const prismaError = error as Prisma.PrismaClientKnownRequestError
      const fields = (prismaError.meta?.['target'] as string[] | undefined)?.join(', ') ?? 'campo'
      reply.status(409).send({
        success: false,
        error: `Conflito: ${fields} já está em uso`,
      })
      return
    }

    // P2003: Foreign key constraint violation
    if (error.code === 'P2003') {
      reply.status(422).send({
        success: false,
        error: 'Referência inválida: um dos IDs fornecidos não existe',
      })
      return
    }
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
