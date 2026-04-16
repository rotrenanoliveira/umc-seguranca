import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { BCRYPT_ROUNDS } from '@/config'
import { db } from '@/infra/http/database'
import { usersRepository } from '@/infra/http/database/repositories'

export async function registerUser(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/users',
    {
      schema: {
        tags: ['users'],
        summary: 'Register',
        description: 'Register a new user',
        body: z.object({
          email: z.email({ error: 'E-mail inválido.' }),
          name: z.string().min(1, { error: 'Nome é obrigatório.' }),
          password: z.string().min(8, { error: 'A senha deve ter no mínimo 8 caracteres.' }),
          consent: z.coerce.boolean().optional(),
        }),
        response: {
          201: z.object({ userId: z.string() }),
          409: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { email, name, password, consent } = request.body

      const existing = await db.select().from(usersRepository).where(eq(usersRepository.email, email)).limit(1)
      const hasUserWithSameEmail = existing.length > 0

      if (hasUserWithSameEmail) {
        return reply.status(409).send({ message: 'E-mail já cadastrado' })
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

      const now = new Date()

      const [created] = await db
        .insert(usersRepository)
        .values({
          email,
          name,
          password: passwordHash,
          consentAt: consent ? now : null,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: usersRepository.id })

      return reply.status(201).send({
        userId: created.id,
      })
    },
  )
}
