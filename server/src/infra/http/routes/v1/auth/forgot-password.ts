import dayjs from 'dayjs'
import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { PASSWORD_RESET_TTL_MIN } from '@/config'
import { db } from '@/infra/database'
import { accessCodesRepository, usersRepository } from '@/infra/database/repositories'
import { generateNanoId } from '@/lib/nanoid'
import { resend } from '@/lib/resend'

export async function forgotPassword(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/password/forgot',
    {
      schema: {
        tags: ['authentication'],
        summary: 'Recuperação de senha',
        description: 'Recuperação de senha',
        body: z.object({
          email: z.email(),
        }),
        response: {
          200: z.object({ message: z.string() }),
          400: z.object({ error: z.string() }),
          500: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { email } = request.body

      const user = await db
        .select({
          id: usersRepository.id,
          email: usersRepository.email,
          name: usersRepository.name,
        })
        .from(usersRepository)
        .where(eq(usersRepository.email, email))
        .then((result) => (result.length > 0 ? result[0] : null))

      if (!user) {
        return reply.status(400).send({ error: 'Usuário não encontrado.' })
      }

      //==== Gera um token de recuperação de senha
      const accessCode = await db
        .insert(accessCodesRepository)
        .values({
          codeId: generateNanoId(),
          user: user.id,
          type: 'PASSWORD_RESET',
          token: generateNanoId(6),
        })
        .returning({ token: accessCodesRepository.token })
        .then((result) => (result.length > 0 ? result[0] : null))

      if (!accessCode) {
        return reply.status(500).send({ error: 'Erro ao gerar token de recuperação de senha.' })
      }

      const expiresAt = dayjs().add(PASSWORD_RESET_TTL_MIN, 'minutes')

      const mail = await resend.emails.send({
        from: 'UMC - Projeto de Segurança <noreply@rotrenanoliveira.com>',
        to: [user.email],
        subject: 'Recuperação de senha',
        text: [
          `Olá, ${user.name}.`,
          '',
          `Para definir uma nova senha, use o código de acesso: ${accessCode.token}`,
          `Válido até ${expiresAt.toDate().toLocaleDateString('pt-BR')}`,
          '',
          'Se não foi você, ignore este e-mail.',
        ].join('\n'),
      })

      return reply.send({
        message: !mail.error
          ? 'Enviamos um e-mail para o seu e-mail.'
          : `Não foi possível enviar o e-mail para o seu e-mail: ${mail.error}.`,
      })
    },
  )
}
