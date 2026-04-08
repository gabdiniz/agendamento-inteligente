import { buildApp } from './infrastructure/http/app.js'

const PORT = Number(process.env['PORT'] ?? 3333)
const HOST = process.env['HOST'] ?? '0.0.0.0'

async function bootstrap() {
  const app = await buildApp()

  try {
    await app.listen({ port: PORT, host: HOST })
    console.log(`🚀 MyAgendix API running on http://${HOST}:${PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

bootstrap()
