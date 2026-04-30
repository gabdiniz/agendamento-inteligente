// ─── Clinic Upload Routes ──────────────────────────────────────────────────────
//
// Rotas de upload de arquivos no escopo do tenant.
// Registradas em /t/:slug/upload/*
//
// POST /t/:slug/upload/avatar   → salva avatar de profissional em disco, retorna URL (GESTOR)
// POST /t/:slug/upload/logo     → salva logo da clínica, retorna URL (GESTOR)
// POST /t/:slug/upload/banner   → salva banner de login da clínica, retorna URL (GESTOR)
// ─────────────────────────────────────────────────────────────────────────────

import type { FastifyPluginAsync } from 'fastify'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { requireAuth, requireRoles } from '../middlewares/auth.middleware.js'

const ALLOWED_MIME     = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'])
const ALLOWED_MIME_SVG = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml'])
const MAX_SIZE_BYTES   = 5 * 1024 * 1024 // 5 MB

const EXT_MAP: Record<string, string> = {
  'image/png':     '.png',
  'image/jpeg':    '.jpg',
  'image/jpg':     '.jpg',
  'image/webp':    '.webp',
  'image/gif':     '.gif',
  'image/svg+xml': '.svg',
}

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

  // ─── POST /logo ───────────────────────────────────────────────
  // Logo da clínica — salva em uploads/logos/
  app.post(
    '/logo',
    { preHandler: [requireAuth, requireRoles('GESTOR')] },
    async (request, reply) => {
      const data = await request.file()
      if (!data) return reply.status(400).send({ success: false, error: 'Nenhum arquivo enviado.' })
      if (!ALLOWED_MIME_SVG.has(data.mimetype)) {
        return reply.status(400).send({ success: false, error: 'Formato não suportado. Envie PNG, JPG, WebP, SVG ou GIF.' })
      }
      const buffer = await data.toBuffer()
      if (buffer.byteLength > MAX_SIZE_BYTES) {
        return reply.status(400).send({ success: false, error: 'Arquivo muito grande. Máximo 5 MB.' })
      }
      const ext = EXT_MAP[data.mimetype] ?? extname(data.filename).toLowerCase()
      const filename = `${Date.now()}-${randomUUID()}${ext}`
      const uploadsDir = join(process.cwd(), 'uploads', 'logos')
      await mkdir(uploadsDir, { recursive: true })
      await writeFile(join(uploadsDir, filename), buffer)
      return reply.status(201).send({ success: true, data: { url: `/uploads/logos/${filename}` } })
    },
  )

  // ─── POST /banner ─────────────────────────────────────────────
  // Banner de fundo da tela de login — salva em uploads/banners/
  app.post(
    '/banner',
    { preHandler: [requireAuth, requireRoles('GESTOR')] },
    async (request, reply) => {
      const data = await request.file()
      if (!data) return reply.status(400).send({ success: false, error: 'Nenhum arquivo enviado.' })
      if (!ALLOWED_MIME.has(data.mimetype)) {
        return reply.status(400).send({ success: false, error: 'Formato não suportado. Envie PNG, JPG, WebP ou GIF.' })
      }
      const buffer = await data.toBuffer()
      if (buffer.byteLength > MAX_SIZE_BYTES) {
        return reply.status(400).send({ success: false, error: 'Arquivo muito grande. Máximo 5 MB.' })
      }
      const ext = EXT_MAP[data.mimetype] ?? extname(data.filename).toLowerCase()
      const filename = `${Date.now()}-${randomUUID()}${ext}`
      const uploadsDir = join(process.cwd(), 'uploads', 'banners')
      await mkdir(uploadsDir, { recursive: true })
      await writeFile(join(uploadsDir, filename), buffer)
      return reply.status(201).send({ success: true, data: { url: `/uploads/banners/${filename}` } })
    },
  )
}
