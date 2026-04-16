import { drizzle } from 'drizzle-orm/node-postgres'
import { env } from '@/environment-variables.js'
import * as schema from './schema.js'

export const db = drizzle(env.DATABASE_URL, {
  logger: env.NODE_ENV === 'development',
  schema: { ...schema },
})
