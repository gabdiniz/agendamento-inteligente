// ─── Upload Routes ─────────────────────────────────────────────────────────────
//
// Rota de upload de arquivos do super admin.
// Registrada em /super-admin/upload/*
//
// POST /super-admin/upload/logo    → salva logo de clínica em disco, retorna URL
// POST /super-admin/upload/banner  → salva banner de clínica em disco, retorna URL
// ─────────────────────────────────────────────────────────────────────────────

import type { FastifyPluginAsync } from 'fastify'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { requireSuperAdmin } from '../middlewares/super-admin-auth.middleware.js'

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif'])
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export const uploadRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireSuperAdmin)

  // ─── POST /logo ───────────────────────────────────────────────
  app.post('/logo', async (request, reply) => {
    const data = await request.file()
    if (!data) {
      return reply.status(400).send({ success: false, error: 'Nenhum arquivo enviado.' })
    }

    // Valida MIME
    if (!ALLOWED_MIME.has(data.mimetype)) {
      return reply.status(400).send({
        success: false,
        error: 'Formato não suportado. Envie PNG, JPG, WebP, SVG ou GIF.',
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

    // Determina extensão a partir do MIME (mais confiável que o nome do arquivo)
    const extMap: Record<string, string> = {
      'image/png':     '.png',
      'image/jpeg':    '.jpg',
      'image/jpg':     '.jpg',
      'image/webp':    '.webp',
      'image/svg+xml': '.svg',
      'image/gif':     '.gif',
    }
    const ext = extMap[data.mimetype] ?? extname(data.filename).toLowerCase()
    const filename = `${Date.now()}-${randomUUID()}${ext}`

    // Salva em disco
    const uploadsDir = join(process.cwd(), 'uploads', 'logos')
    await mkdir(uploadsDir, { recursive: true })
    await writeFile(join(uploadsDir, filename), buffer)

    // Retorna a URL relativa — o frontend prefixará com VITE_API_URL
    const url = `/uploads/logos/${filename}`

    return reply.status(201).send({ success: true, data: { url } })
  })

  // ─── POST /banner ─────────────────────────────────────────────
  app.post('/banner', async (request, reply) => {
    const data = await request.file()
    if (!data) {
      return reply.status(400).send({ success: false, error: 'Nenhum arquivo enviado.' })
    }

    if (!ALLOWED_MIME.has(data.mimetype)) {
      return reply.status(400).send({
        success: false,
        error: 'Formato não suportado. Envie PNG, JPG, WebP, SVG ou GIF.',
      })
    }

    const buffer = await data.toBuffer()
    if (buffer.byteLength > MAX_SIZE_BYTES) {
      return reply.status(400).send({
        success: false,
        error: 'Arquivo muito grande. Máximo 5 MB.',
      })
    }

    const extMap: Record<string, string> = {
      'image/png':     '.png',
      'image/jpeg':    '.jpg',
      'image/jpg':     '.jpg',
      'image/webp':    '.webp',
      'image/svg+xml': '.svg',
      'image/gif':     '.gif',
    }
    const ext = extMap[data.mimetype] ?? extname(data.filename).toLowerCase()
    const filename = `${Date.now()}-${randomUUID()}${ext}`

    const uploadsDir = join(process.cwd(), 'uploads', 'banners')
    await mkdir(uploadsDir, { recursive: true })
    await writeFile(join(uploadsDir, filename), buffer)

    const url = `/uploads/banners/${filename}`
    return reply.status(201).send({ success: true, data: { url } })
  })
}
