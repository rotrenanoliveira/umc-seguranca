import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { registerUser } from '../users/register.js'
import { getProfile } from './profile.js'

export const userRoutes: FastifyPluginAsyncZod = async (server) => {
  /**  POST /register - Cadastra um novo usuário. */
  server.register(registerUser)
}
