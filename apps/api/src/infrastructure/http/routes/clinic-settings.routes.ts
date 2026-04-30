// ─── Clinic Settings Routes ────────────────────────────────────────────────────
//
// Permite que o GESTOR da clínica atualize as configurações de branding da
// própria clínica (logo, banner, cores) sem precisar do super-admin.
//
// PATCH /t/:slug/clinic/settings  → atualiza logo, banner e cores do tenant
// ─────────────────────────────────────────────────────────────────────────────

import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '@myagendix/database'
import { requireAuth, requireRoles } from '../middlewares/auth.middleware.js'

// ─── Schema de validação ─────────────────────────────────────────────────────

const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato #RRGGBB')
  .optional()
  .nullable()

const updateSettingsSchema = z.object({
  logoUrl:        z.string().optional().nullable(),
  bannerUrl:      z.string().optional().nullable(),
  colorPrimary:   hexColorSchema,
  colorSecondary: hexColorSchema,
  colorSidebar:   hexColorSchema,
})

// ─── Routes ──────────────────────────────────────────────────────────────────

export const clinicSettingsRoutes: FastifyPluginAsync = async (app) => {

  // ─── PATCH /settings ──────────────────────────────────────────
  // Atualiza os dados de branding do tenant atual.
  // Apenas GESTOR tem permissão.
  app.patch(
    '/settings',
    { preHandler: [requireAuth, requireRoles('GESTOR')] },
    async (request, reply) => {
      const tenantId = request.tenantId
      const body = updateSettingsSchema.parse(request.body)

      const updateData: Record<string, unknown> = {}
      if (body.logoUrl        !== undefined) updateData['logoUrl']        = body.logoUrl
      if (body.bannerUrl      !== undefined) updateData['bannerUrl']      = body.bannerUrl
      if (body.colorPrimary   !== undefined) updateData['colorPrimary']   = body.colorPrimary
      if (body.colorSecondary !== undefined) updateData['colorSecondary'] = body.colorSecondary
      if (body.colorSidebar   !== undefined) updateData['colorSidebar']   = body.colorSidebar

      const tenant = await prisma.tenant.update({
        where: { id: tenantId },
        data:  updateData,
        select: {
          id: true, name: true, slug: true,
          logoUrl: true, bannerUrl: true,
          colorPrimary: true, colorSecondary: true, colorSidebar: true,
        },
      })

      return reply.status(200).send({ success: true, data: tenant })
    },
  )

  // ─── GET /settings ────────────────────────────────────────────
  // Retorna as configurações de branding atuais do tenant.
  // Apenas GESTOR tem permissão.
  app.get(
    '/settings',
    { preHandler: [requireAuth, requireRoles('GESTOR')] },
    async (request, reply) => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: request.tenantId },
        select: {
          id: true, name: true, slug: true,
          logoUrl: true, bannerUrl: true,
          colorPrimary: true, colorSecondary: true, colorSidebar: true,
        },
      })

      if (!tenant) {
        return reply.status(404).send({ success: false, error: 'Clínica não encontrada.' })
      }

      return reply.status(200).send({ success: true, data: tenant })
    },
  )
}
