import { createHash } from 'node:crypto'
import dayjs from 'dayjs'
import { and, eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { LOCKOUT_MINUTES, MAX_LOGIN_ATTEMPTS, TWO_FACTOR_PENDING_TTL_MIN } from '@/config'
import { env } from '@/environment-variables'
import { db } from '@/infra/database'
import { accessCodesRepository, sessionsRepository, usersRepository } from '@/infra/database/repositories'
import { generateNanoId } from '@/lib/nanoid'

export async function authenticateAccessCode(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/auth/authenticate-access-code',
    {
      schema: {
        tags: ['authentication'],
        summary: 'Autenticar código de acesso',
        description: 'Cria uma sessão, autenticando o usuário com o código de acesso.',
        body: z.object({
          email: z.string(),
          code: z.string(),
        }),
        response: {
          200: z.object({ token: z.string() }),
          401: z.object({ error: z.string() }),
          423: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { email, code } = request.body

      // Valida formato do código
      if (code.length !== 6) {
        return reply.status(401).send({ error: 'Credenciais inválidas.' })
      }

      const user = await db
        .select({
          id: usersRepository.id,
          failedLoginAttempts: usersRepository.failedLoginAttempts,
          lockedUntil: usersRepository.lockedUntil,
        })
        .from(usersRepository)
        .where(eq(usersRepository.email, email))
        .then((result) => (result.length > 0 ? result[0] : null))

      if (!user) {
        return reply.status(401).send({ error: 'Credenciais inválidas.' })
      }

      const accessCode = await db
        .select({
          code: accessCodesRepository.token,
          user: accessCodesRepository.user,
          createdAt: accessCodesRepository.createdAt,
        })
        .from(accessCodesRepository)
        .innerJoin(usersRepository, eq(accessCodesRepository.user, usersRepository.id))
        .where(and(eq(accessCodesRepository.user, user.id)))
        .then((result) => (result.length > 0 ? result[0] : null))

      let isValidAccessCode = false

      // Valida se o código é válido
      if (accessCode && accessCode.code === code) {
        isValidAccessCode = true
      }

      // Valida se o usuário é o que enviou o código
      if (accessCode && accessCode.user === user.id) {
        isValidAccessCode = true
      }

      const now = new Date()

      if (!accessCode || !isValidAccessCode) {
        const attempts = user.failedLoginAttempts + 1
        let lockedUntil = user.lockedUntil

        if (attempts >= MAX_LOGIN_ATTEMPTS) {
          lockedUntil = new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000)
        }

        await db
          .update(usersRepository)
          .set({
            failedLoginAttempts: attempts >= MAX_LOGIN_ATTEMPTS ? 0 : attempts,
            lockedUntil,
          })
          .where(eq(usersRepository.id, user.id))

        if (attempts >= MAX_LOGIN_ATTEMPTS) {
          return reply.status(423).send({
            error: `Conta bloqueada por ${LOCKOUT_MINUTES} minutos após tentativas falhas de login.`,
          })
        }

        return reply.status(401).send({ error: 'Credenciais inválidas' })
      }

      // Valida se o código expirou
      const hasCodeExpired = dayjs().diff(dayjs(accessCode.createdAt), 'minutes') > TWO_FACTOR_PENDING_TTL_MIN
      if (hasCodeExpired) {
        return reply.status(401).send({ error: 'Token expirado.' })
      }

      const sessionId = generateNanoId()
      const accessToken = await reply.jwtSign({ sub: user.id }, { expiresIn: '15m' })
      const refreshToken = await reply.jwtSign({ sub: user.id, session: sessionId }, { expiresIn: '7d' })
      const refreshTokenHash = createHash('sha256').update(refreshToken).digest('hex')

      // Cria sessão e exclui o código de acesso
      await Promise.all([
        db.insert(sessionsRepository).values({
          id: sessionId,
          user: user.id,
          refreshTokenHash,
          expiresAt: dayjs().add(30, 'days').toDate(),
        }),
        db
          .delete(accessCodesRepository)
          .where(and(eq(accessCodesRepository.user, user.id), eq(accessCodesRepository.token, code))),
      ])

      return reply
        .setCookie('refreshToken', refreshToken, {
          httpOnly: true,
          secure: env.NODE_ENV === 'production',
          sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
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
