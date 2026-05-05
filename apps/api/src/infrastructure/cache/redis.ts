import { Redis } from 'ioredis'

let redisClient: Redis | null = null

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null, // required by BullMQ
      lazyConnect: true,
    })

    redisClient.on('error', (err: Error) => {
      console.error('[Redis] Connection error:', err)
    })

    redisClient.on('connect', () => {
      console.log('[Redis] Connected')
    })
  }

  return redisClient
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
}
