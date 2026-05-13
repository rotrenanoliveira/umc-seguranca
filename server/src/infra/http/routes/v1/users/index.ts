import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { registerUser } from '../users/register.js'
import { deleteUser } from './delete.js'
import { getPersonalData } from './personal-data.js'
import { getProfile } from './profile.js'

export const userRoutes: FastifyPluginAsyncZod = async (server) => {
  /**  POST /register - Cadastra um novo usuário. */
  server.register(registerUser)
  /**  GET /sessions/me - Retorna o perfil do usuário. */
  server.register(getProfile)
  /**  GET /sessions/me/personal-data - Dados pessoais do titular (LGPD). */
  server.register(getPersonalData)
  /**  DELETE /users/me - Exclusão dos dados do titular (LGPD). */
  server.register(deleteUser)
}
