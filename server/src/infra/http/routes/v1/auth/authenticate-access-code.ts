import { createHash } from 'node:crypto'
import dayjs from 'dayjs'
import { and, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { TWO_FACTOR_PENDING_TTL_MIN } from '@/config'
import { db } from '@/db'
import { accessCodesRepository, sessionsRepository, usersRepository } from '@/db/repositories'
import { env } from '@/environment-variables'
import { generateNanoId } from '@/lib/nanoid'

export async function authenticateAccessCode(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/sessions',
    {
      schema: {
        tags: ['authentication'],
        summary: 'Autenticar código de acesso',
        description: 'Cria uma sessão, autenticando o usuário com o código de acesso.',
        body: z.object({
          userId: z.string(),
          code: z.string(),
        }),
        response: {
          200: z.object({
            token: z.string(),
          }),
          401: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { userId, code } = request.body

      // validate code format
      if (code.length !== 6) {
        return reply.status(401).send({ error: 'Credenciais inválidas.' })
      }

      const accessCode = await db
        .select({
          code: accessCodesRepository.token,
          user: accessCodesRepository.user,
          createdAt: accessCodesRepository.createdAt,
        })
        .from(accessCodesRepository)
        .where(and(eq(accessCodesRepository.user, userId), eq(accessCodesRepository.token, code)))
        .then((result) => (result.length > 0 ? result[0] : null))

      // Valida se o código existe
      if (!accessCode) {
        return reply.status(401).send({ error: 'Credenciais inválidas.' })
      }
      // Valida se o código é válido
      if (accessCode.code !== code) {
        return reply.status(401).send({ error: 'Credenciais inválidas.' })
      }
      // Valida se o usuário é o que enviou o código
      if (accessCode.user !== userId) {
        return reply.status(401).send({ error: 'Credenciais inválidas.' })
      }

      // Valida se o código expirou
      const hasCodeExpired = dayjs().diff(dayjs(accessCode.createdAt), 'minutes') > TWO_FACTOR_PENDING_TTL_MIN
      if (hasCodeExpired) {
        return reply.status(401).send({ error: 'Token expirado.' })
      }

      const user = await db
        .select({ userId: usersRepository.id })
        .from(usersRepository)
        .where(eq(usersRepository.id, userId))
        .then((result) => (result.length > 0 ? result[0] : null))

      // Valida se o usuário existe
      if (!user) {
        return reply.status(401).send({ error: 'Credenciais inválidas.' })
      }

      const sessionId = generateNanoId()
      const accessToken = await reply.jwtSign({ sub: userId }, { expiresIn: '15m' })
      const refreshToken = await reply.jwtSign({ sub: userId, session: sessionId }, { expiresIn: '7d' })
      const refreshTokenHash = createHash('sha256').update(refreshToken).digest('hex')

      // Cria sessão e exclui o código de acesso
      await Promise.all([
        db.insert(sessionsRepository).values({
          id: sessionId,
          user: userId,
          refreshTokenHash,
          expiresAt: dayjs().add(30, 'days').toDate(),
        }),
        db
          .delete(accessCodesRepository)
          .where(and(eq(accessCodesRepository.user, userId), eq(accessCodesRepository.token, code))),
      ])

      return reply
        .setCookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: env.NODE_ENV === 'production',
          sameSite: 'none',
          path: '/',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        })
        .status(200)
        .send({
          token: accessToken,
        })
    },
  )
}
