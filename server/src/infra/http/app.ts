import 'dotenv/config'
import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
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
import { sessionRoutes } from './routes/v1/sessions'
import { userRoutes } from './routes/v1/users'

export const app = fastify({
  logger:
    process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development'
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

// CORS
app.register(fastifyCors, {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
})

// RATE LIMIT
app.register(rateLimit, {
  max: RATE_MAX,
  timeWindow: RATE_TIME_WINDOW_MS,
})

//==== Routes
app.get('/health', async () => ({
  ok: true,
  tlsNote: 'Em produção, termine TLS no proxy reverso ou use HTTPS nativo do Node para criptografia em trânsito.',
}))

app.register(authenticateRoutes)
app.register(sessionRoutes)
app.register(userRoutes)
