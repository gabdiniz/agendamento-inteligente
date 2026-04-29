// ─── Clinic Upload Routes ──────────────────────────────────────────────────────
//
// Rotas de upload de arquivos no escopo do tenant.
// Registradas em /t/:slug/upload/*
//
// POST /t/:slug/upload/avatar  → salva avatar de profissional em disco, retorna URL
//                                Requer autenticação GESTOR.
// ─────────────────────────────────────────────────────────────────────────────

import type { FastifyPluginAsync } from 'fastify'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { requireAuth, requireRoles } from '../middlewares/auth.middleware.js'

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'])
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export const clinicUploadRoutes: FastifyPluginAsync = async (app) => {

  // ─── POST /avatar ─────────────────────────────────────────────────────────
  // Faz upload de uma foto de perfil de profissional.
  // Salva em uploads/avatars/ e retorna a URL relativa.
  app.post(
    '/avatar',
    { preHandler: [requireAuth, requireRoles('GESTOR')] },
    async (request, reply) => {
      const data = await request.file()
      if (!data) {
        return reply.status(400).send({ success: false, error: 'Nenhum arquivo enviado.' })
      }

      // Valida MIME
      if (!ALLOWED_MIME.has(data.mimetype)) {
        return reply.status(400).send({
          success: false,
          error: 'Formato não suportado. Envie PNG, JPG, WebP ou GIF.',
        })
      }

      // Lê o buffer e valida tamanho
      const buffer = await data.toBuffer()
      if (buffer.byteLength > MAX_SIZE_BYTES) {
        return reply.status(400).send({
          success: false,
          error: 'Arquivo muito grande. Máximo 5 MB.',
        })
      }

      const extMap: Record<string, string> = {
        'image/png':  '.png',
        'image/jpeg': '.jpg',
        'image/jpg':  '.jpg',
        'image/webp': '.webp',
        'image/gif':  '.gif',
      }
      const ext = extMap[data.mimetype] ?? extname(data.filename).toLowerCase()
      const filename = `${Date.now()}-${randomUUID()}${ext}`

      // Salva em disco
      const uploadsDir = join(process.cwd(), 'uploads', 'avatars')
      await mkdir(uploadsDir, { recursive: true })
      await writeFile(join(uploadsDir, filename), buffer)

      // Retorna URL relativa — o frontend prefixará com VITE_API_URL
      const url = `/uploads/avatars/${filename}`

      return reply.status(201).send({ success: true, data: { url } })
    },
  )
}
