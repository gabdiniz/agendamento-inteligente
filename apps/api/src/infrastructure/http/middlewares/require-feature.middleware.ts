// ─── requireFeature middleware ────────────────────────────────────────────────
//
// Verifica se o tenant autenticado possui uma feature específica no seu plano.
// Deve ser usado APÓS requireAuth (request.tenantId já disponível).
//
// Uso:
//   app.post('/crm', { preHandler: [requireAuth, requireFeature('crm')] }, handler)
//
// ─────────────────────────────────────────────────────────────────────────────

import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@myagendix/database'

export function requireFeature(featureSlug: string) {
  return async function checkFeature(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const tenant = await prisma.tenant.findUnique({
        where:  { id: request.tenantId },
        select: {
          plan: {
            select: {
              features: {
                where: { feature: { slug: featureSlug } },
                select: { featureId: true },
              },
            },
          },
        },
      })

      const hasFeature = (tenant?.plan?.features.length ?? 0) > 0

      if (!hasFeature) {
        return reply.status(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: `Esta funcionalidade não está disponível no seu plano atual. Faça upgrade para ter acesso.`,
          featureRequired: featureSlug,
        })
      }
    } catch {
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Erro ao verificar permissões do plano',
      })
    }
  }
}
