import { z } from 'zod'

// console.log(process.env)

const envSchema = z.object({
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // PostgreSQL (use docker-compose ou instância local)
  DATABASE_URL: z.string(),
  // Base pública da API (links em e-mails)
  APP_PUBLIC_URL: z.url(),
  APP_PORT: z.coerce.number().default(3000),
  APP_HOST: z.string().default('0.0.0.0'),
  // Authentication
  AUTHENTICATION_JWT_SECRET: z.string(),
  AUTHENTICATION_COOKIE_SECRET: z.string(),
  // Resend API
  RESEND_API_KEY: z.string(),
})

const _env = envSchema.safeParse(process.env)

if (_env.success === false) {
  console.error('❌ Invalid environment variables:', z.prettifyError(_env.error))
  throw new Error('Invalid environment variables')
}

export const env = _env.data
