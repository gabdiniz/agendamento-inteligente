// ─── WhatsApp Worker ──────────────────────────────────────────────────────────
//
// Polling loop que roda dentro do processo da API.
// A cada POLL_INTERVAL_MS:
//   1. Busca jobs PENDING com scheduledAt <= now()
//   2. Para cada job:
//      a. Marca como SENDING (evita duplo processamento)
//      b. Busca config Z-API do tenant (cache em memória, TTL 5min)
//      c. Se whatsappEnabled = false → CANCELED
//      d. Chama Z-API
//      e. Sucesso → SENT | Falha → retry com backoff ou FAILED
//
// Inicia via startWhatsappWorker() chamado em buildApp() após servidor pronto.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma, createTenantClient } from '@myagendix/database'
import { ZApiClient, ZApiError } from '../../infrastructure/external/zapi.client.js'

const POLL_INTERVAL_MS  = 30_000   // 30 segundos
const BATCH_SIZE        = 50       // jobs por ciclo
const CACHE_TTL_MS      = 5 * 60 * 1000  // 5 minutos

// Backoff em minutos por número de retries (0-indexed = próxima tentativa)
const BACKOFF_MINUTES = [5, 15, 60]
const MAX_RETRIES     = 3

// ─── Cache de config Z-API por tenantId ───────────────────────────────────────

interface TenantZApiConfig {
  whatsappEnabled:  boolean
  zApiInstanceId:   string | null
  zApiToken:        string | null
  reminderHoursBefore: number
  tenantSchema:     string
  fetchedAt:        number
}

const configCache = new Map<string, TenantZApiConfig>()

async function getTenantConfig(tenantId: string): Promise<TenantZApiConfig | null> {
  const cached = configCache.get(tenantId)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      slug:               true,
      whatsappEnabled:    true,
      zApiInstanceId:     true,
      zApiToken:          true,
      reminderHoursBefore: true,
    },
  })

  if (!tenant) return null

  const config: TenantZApiConfig = {
    whatsappEnabled:     tenant.whatsappEnabled,
    zApiInstanceId:      tenant.zApiInstanceId,
    zApiToken:           tenant.zApiToken,
    reminderHoursBefore: tenant.reminderHoursBefore,
    tenantSchema:        `tenant_${tenant.slug.replace(/-/g, '_')}`,
    fetchedAt:           Date.now(),
  }

  configCache.set(tenantId, config)
  return config
}

// ─── Worker ───────────────────────────────────────────────────────────────────

const zapiClient = new ZApiClient()

async function processBatch(): Promise<void> {
  // Busca todos os tenants com WhatsApp habilitado que tenham jobs pendentes
  // Para cada tenant, processamos o lote de jobs do seu schema
  const tenantsWithJobs = await prisma.tenant.findMany({
    where: { whatsappEnabled: true, isActive: true },
    select: { id: true, slug: true, zApiInstanceId: true, zApiToken: true },
  })

  for (const tenant of tenantsWithJobs) {
    if (!tenant.zApiInstanceId || !tenant.zApiToken) continue

    const tenantSchema = `tenant_${tenant.slug.replace(/-/g, '_')}`
    const tenantPrisma = createTenantClient(tenantSchema)

    try {
      await processTenantJobs(tenant.id, tenant.zApiInstanceId, tenant.zApiToken, tenantPrisma)
    } finally {
      await tenantPrisma.$disconnect()
    }
  }
}

async function processTenantJobs(
  tenantId: string,
  instanceId: string,
  token: string,
  tenantPrisma: ReturnType<typeof createTenantClient>,
): Promise<void> {
  const now = new Date()

  // Busca jobs pendentes cujo scheduledAt já passou
  const jobs = await (tenantPrisma as any).whatsappJob.findMany({
    where: {
      status:      'PENDING',
      scheduledAt: { lte: now },
    },
    orderBy: { scheduledAt: 'asc' },
    take: BATCH_SIZE,
  })

  if (jobs.length === 0) return

  for (const job of jobs) {
    // Marca como SENDING atomicamente — evita duplo processamento
    const updated = await (tenantPrisma as any).whatsappJob.updateMany({
      where: { id: job.id, status: 'PENDING' }, // garante idempotência
      data:  { status: 'SENDING' },
    })

    // Se outra instância já pegou este job, skip
    if (updated.count === 0) continue

    try {
      await zapiClient.sendText(instanceId, token, job.phone, job.message)

      await (tenantPrisma as any).whatsappJob.update({
        where: { id: job.id },
        data:  { status: 'SENT', sentAt: new Date() },
      })
    } catch (err) {
      const retries = job.retries + 1
      const zapiErr = err instanceof ZApiError ? err : null
      const isRetryable = zapiErr ? zapiErr.retryable : true // network errors são retryable

      if (!isRetryable || retries >= MAX_RETRIES) {
        // Falha definitiva
        await (tenantPrisma as any).whatsappJob.update({
          where: { id: job.id },
          data:  {
            status:   'FAILED',
            retries,
            errorLog: String(err),
          },
        })
        console.error(`[WhatsApp Worker] Job ${job.id} falhou definitivamente (tentativa ${retries}):`, String(err))
      } else {
        // Agenda próxima tentativa com backoff
        const backoffMin = BACKOFF_MINUTES[retries - 1] ?? 60
        const nextAttempt = new Date(Date.now() + backoffMin * 60 * 1000)

        await (tenantPrisma as any).whatsappJob.update({
          where: { id: job.id },
          data:  {
            status:      'PENDING',
            retries,
            scheduledAt: nextAttempt,
            errorLog:    String(err),
          },
        })
        console.warn(`[WhatsApp Worker] Job ${job.id} falhou (tentativa ${retries}), retry em ${backoffMin}min`)
      }
    }
  }
}

// ─── Start / Stop ─────────────────────────────────────────────────────────────

let intervalHandle: ReturnType<typeof setInterval> | null = null

export function startWhatsappWorker(): void {
  if (intervalHandle) return // já rodando

  console.log('[WhatsApp Worker] Iniciado (polling a cada 30s)')

  // Primeira execução imediata, depois a cada POLL_INTERVAL_MS
  void processBatch().catch((err) => console.error('[WhatsApp Worker] Erro no ciclo inicial:', err))

  intervalHandle = setInterval(() => {
    void processBatch().catch((err) => console.error('[WhatsApp Worker] Erro no ciclo:', err))
  }, POLL_INTERVAL_MS)

  // Não impede o processo de encerrar (unref)
  if (intervalHandle.unref) intervalHandle.unref()
}

export function stopWhatsappWorker(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
    console.log('[WhatsApp Worker] Parado')
  }
}
