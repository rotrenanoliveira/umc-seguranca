import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { db } from '@/infra/http/database'
import { usersRepository } from '@/infra/http/database/repositories'

export async function getProfile(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/sessions/me',
    {
      schema: {
        tags: ['sessions'],
        summary: 'Perfil do usuário',
        description: 'Busca o perfil do usuário logado.',
        response: {
          200: z.object({
            user: z.object({
              name: z.string(),
              email: z.string().nullable(),
            }),
          }),
          404: z.null(),
        },
      },
    },
    async (request, reply) => {
      const { sub: userId } = await request.jwtVerify<{ sub: string }>()

      const user = await db
        .select({
          name: usersRepository.name,
          email: usersRepository.email,
        })
        .from(usersRepository)
        .where(eq(usersRepository.id, userId))
        .then((result) => (result.length > 0 ? result[0] : null))

      if (!user) {
        return reply.code(404).send(null)
      }

      return reply.status(200).send({
        user,
      })
    },
  )
}
