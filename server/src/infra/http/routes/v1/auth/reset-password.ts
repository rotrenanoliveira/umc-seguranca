import bcrypt from 'bcryptjs'
import dayjs from 'dayjs'
import { and, eq, isNull } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { BCRYPT_ROUNDS, PASSWORD_RESET_TTL_MIN } from '@/config'
import { db } from '@/infra/database'
import { accessCodesRepository, sessionsRepository, usersRepository } from '@/infra/database/repositories'

export async function resetPassword(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/password/reset',
    {
      schema: {
        tags: ['authentication'],
        summary: 'Reset Senha',
        description: 'Reset Senha',
        body: z.object({
          code: z.string().min(1),
          password: z.string().min(8).max(128),
        }),
        response: {
          200: z.object({ message: z.string() }),
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { code, password } = request.body

      const accessCode = await db
        .select({
          code: accessCodesRepository.token,
          user: accessCodesRepository.user,
          createdAt: accessCodesRepository.createdAt,
        })
        .from(accessCodesRepository)
        .where(eq(accessCodesRepository.token, code))
        .then((result) => (result.length > 0 ? result[0] : null))

      // Valida se o código existe
      if (!accessCode) {
        return reply.status(401).send({ error: 'Credenciais inválidas.' })
      }

      // Valida se o código expirou
      const hasCodeExpired = dayjs().diff(dayjs(accessCode.createdAt), 'minutes') > PASSWORD_RESET_TTL_MIN
      if (hasCodeExpired) {
        return reply.status(401).send({ error: 'Token expirado.' })
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

      await db
        .update(usersRepository)
        .set({
          password: passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
        })
        .where(eq(usersRepository.id, accessCode.user))

      await db
        .update(sessionsRepository)
        .set({
          revokedAt: new Date(),
        })
        .where(and(eq(sessionsRepository.user, accessCode.user), isNull(sessionsRepository.revokedAt)))

      return reply.send({ message: 'Senha alterada. Faça login novamente.' })
    },
  )
}
