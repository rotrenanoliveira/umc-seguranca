import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { refreshToken } from './refresh-token'

export const sessionRoutes: FastifyPluginAsyncZod = async (server) => {
  /** POST /sessions/refresh - Atualiza a sessão atual com um novo token de acesso. */
  server.register(refreshToken)
}
