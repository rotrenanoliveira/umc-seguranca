import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authenticateAccessCode } from './authenticate-access-code'
import { authenticateWithPassword } from './authenticate-with-password'
import { forgotPassword } from './forgot-password'
import { logout } from './logout'
import { resetPassword } from './reset-password'

export const authenticateRoutes: FastifyPluginAsyncZod = async (server) => {
  /** POST /auth/authenticate - Autentica o usuário com seu email e senha. */
  server.register(authenticateWithPassword)
  /** POST /logout - Revoga a sessão atual. */
  server.register(logout)
  /** POST /password/forgot - Envia um e-mail para o usuário com um token de recuperação de senha. */
  server.register(forgotPassword)
  /** POST /password/reset - Reseta a senha do usuário. */
  server.register(resetPassword)
  /** POST /sessions - Autentica o usuário com seu código de acesso e cria uma sessão. */
  server.register(authenticateAccessCode)
}
