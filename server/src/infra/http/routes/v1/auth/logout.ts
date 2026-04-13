import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { db } from '@/db'
import { sessionsRepository } from '@/db/repositories'

export async function logout(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/logout',
    {
      schema: {
        tags: ['authentication'],
        summary: 'Refresh Token',
        description: 'Refresh the access token.',
        response: {
          200: z.object({ message: z.string() }),
          400: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const auth = request.headers.authorization

      if (!auth?.startsWith('Bearer ')) {
        return reply.status(400).send({ error: 'Bearer obrigatório' })
      }

      const payload = await request.jwtVerify<{ sub: string; session: string }>({ onlyCookie: true })

      if (!payload?.session) {
        return reply.status(400).send({ error: 'Sessão inválida.' })
      }

      await db
        .update(sessionsRepository)
        .set({ revokedAt: new Date() })
        .where(eq(sessionsRepository.id, payload.session))

      return reply.send({ message: 'Sessão revogada' })
    },
  )
}
