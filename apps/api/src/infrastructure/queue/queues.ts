import { Queue } from 'bullmq'
import { getRedis } from '../cache/redis.js'

// ─── Queue names ──────────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  SCHEDULER: 'scheduler',
  WAITLIST: 'waitlist',
  CAMPAIGNS: 'campaigns',       // MVP2
  AI_ASSISTANT: 'ai-assistant', // MVP2
} as const

// ─── Queue instances ──────────────────────────────────────────────────────

export const notificationsQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, {
  connection: getRedis(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
})

export const schedulerQueue = new Queue(QUEUE_NAMES.SCHEDULER, {
  connection: getRedis(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 10000 },
    removeOnComplete: 50,
    removeOnFail: 200,
  },
})

export const waitlistQueue = new Queue(QUEUE_NAMES.WAITLIST, {
  connection: getRedis(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 100,
    removeOnFail: 300,
  },
})
