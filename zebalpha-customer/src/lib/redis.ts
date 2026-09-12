import { Redis } from '@upstash/redis'

/**
 * Global Redis Client Singleton
 * Falls back safely if environment variables are not yet configured in local development.
 */

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

export const redis = (url && token) 
  ? new Redis({ url, token })
  : null

if (!redis && process.env.NODE_ENV === 'production') {
  console.warn('[REDIS WARNING] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing in production environment.')
}
