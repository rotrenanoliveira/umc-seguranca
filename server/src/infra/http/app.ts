import 'dotenv/config'
import fastifyCookie from '@fastify/cookie'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import fastifyJwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import fastifySwagger from '@fastify/swagger'
import scalarAPIReference from '@scalar/fastify-api-reference'
import fastify from 'fastify'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { RATE_MAX, RATE_TIME_WINDOW_MS } from '@/config'
import { env } from '@/environment-variables'
import { authenticateRoutes } from './routes/v1/auth'
import { userRoutes } from './routes/v1/users'

export const app = fastify({
  logger:
    process.env.NODE_ENV === 'test'
      ? undefined
      : {
          transport: {
            target: 'pino-pretty',
            options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
          },
        },
}).withTypeProvider<ZodTypeProvider>()

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'Authentication API',
      version: '1.0.0',
    },
  },
  transform: jsonSchemaTransform,
})

app.register(scalarAPIReference, {
  routePrefix: '/docs',
})

// JWT
app.register(fastifyJwt, {
  secret: env.AUTHENTICATION_JWT_SECRET,
  cookie: {
    cookieName: 'refreshToken',
    signed: false,
  },
})

// Cookies
app.register(fastifyCookie, {
  secret: env.AUTHENTICATION_COOKIE_SECRET,
  parseOptions: {},
})

app.register(helmet, {
  global: true,
  contentSecurityPolicy: false,
})

app.register(cors, { origin: true })
app.register(rateLimit, {
  max: RATE_MAX,
  timeWindow: RATE_TIME_WINDOW_MS,
})

app.get('/health', async () => ({
  ok: true,
  tlsNote: 'Em produção, termine TLS no proxy reverso ou use HTTPS nativo do Node para criptografia em trânsito.',
}))

app.register(userRoutes)
app.register(authenticateRoutes)
