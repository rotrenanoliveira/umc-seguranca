import { createHash } from 'node:crypto'
import dayjs from 'dayjs'
import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { env } from '@/environment-variables'
import { db } from '@/infra/database'
import { sessionsRepository } from '@/infra/database/repositories'
import { generateNanoId } from '@/lib/nanoid'

export async function refreshToken(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/sessions/refresh',
    {
      schema: {
        tags: ['authentication'],
        summary: 'Refresh Token',
        description: 'Atualiza a sessão atual com um novo token de acesso.',
        response: {
          200: z.object({ token: z.string() }),
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const payload = await request.jwtVerify<{ sub: string; session: string }>({ onlyCookie: true })

      const session = await db
        .select({
          refreshTokenHash: sessionsRepository.refreshTokenHash,
          expiresAt: sessionsRepository.expiresAt,
          revokedAt: sessionsRepository.revokedAt,
          user: sessionsRepository.user,
        })
        .from(sessionsRepository)
        .where(eq(sessionsRepository.id, payload.session))
        .then((result) => (result.length > 0 ? result[0] : null))

      // Valida se a sessão existe, se o token de refresh é válido e se a sessão não foi revogada
      if (!session || session.refreshTokenHash === null || session.revokedAt) {
        return reply.status(401).send({ error: 'Credenciais inválidas.' })
      }

      // Valida se o token de refresh existe no cookie
      if (!request.cookies.refreshToken) {
        return reply.status(401).send({ error: 'Credenciais inválidas.' })
      }

      // Valida se o token de refresh é válido
      const incomingHash = createHash('sha256').update(request.cookies.refreshToken).digest('hex')
      if (incomingHash !== session.refreshTokenHash) {
        return reply.status(401).send({ error: 'Credenciais inválidas.' })
      }

      // Valida se a sessão expirou
      if (dayjs(session.expiresAt).diff(dayjs(), 'minutes') < 0) {
        return reply.status(401).send({ error: 'Token expirado.' })
      }

      // Revoga a sessão
      await db
        .update(sessionsRepository)
        .set({ lastSeenAt: new Date(), revokedAt: new Date() })
        .where(eq(sessionsRepository.id, payload.session))

      //==== Cria uma nova sessão
      const sessionId = generateNanoId()
      const accessToken = await reply.jwtSign({ sub: payload.sub }, { expiresIn: '15m' })
      const refreshToken = await reply.jwtSign({ sub: payload.sub, session: payload.session }, { expiresIn: '7d' })
      const refreshTokenHash = createHash('sha256').update(refreshToken).digest('hex')

      await db.insert(sessionsRepository).values({
        id: sessionId,
        user: session.user,
        refreshTokenHash,
        expiresAt: dayjs().add(30, 'days').toDate(),
      })

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
