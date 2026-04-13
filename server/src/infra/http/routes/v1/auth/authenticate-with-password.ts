import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { LOCKOUT_MINUTES, MAX_LOGIN_ATTEMPTS, TWO_FACTOR_PENDING_TTL_MIN } from '@/config'
import { db } from '@/db'
import { accessCodesRepository, usersRepository } from '@/db/repositories'
import { generateNanoId } from '@/lib/nanoid'
import { resend } from '@/lib/resend'

export async function authenticateWithPassword(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/auth/authenticate-password',
    {
      schema: {
        tags: ['authentication'],
        summary: 'Autenticar com senha',
        description: 'Autentica o usuário com seu email e senha',
        body: z.object({
          email: z.email(),
          password: z.string().min(1),
        }),
        response: {
          200: z.object({
            expiresInMinutes: z.number(),
            message: z.string(),
          }),
          400: z.object({ error: z.string() }),
          401: z.object({ error: z.string() }),
          423: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body

      const user = await db
        .select()
        .from(usersRepository)
        .where(eq(usersRepository.email, email))
        .limit(1)
        .then((rows) => (rows.length > 0 ? rows[0] : null))

      if (!user) {
        return reply.status(400).send({ error: 'User not found' })
      }

      const now = new Date()

      if (user.lockedUntil && user.lockedUntil > now) {
        return reply.status(423).send({
          error: 'Conta temporariamente bloqueada por tentativas falhas',
        })
      }

      if (user.lockedUntil && user.lockedUntil <= now) {
        await db.update(usersRepository).set({ lockedUntil: null }).where(eq(usersRepository.id, user.id))
      }

      const isPasswordValid = await bcrypt.compare(password, user.password)

      if (!isPasswordValid) {
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

      await db
        .update(usersRepository)
        .set({ failedLoginAttempts: 0, lockedUntil: null })
        .where(eq(usersRepository.id, user.id))

      //==== Gerando um novo código de acesso - 2FA por e-mail
      const hasAccessCode = await db
        .select({ code: accessCodesRepository.token })
        .from(accessCodesRepository)
        .where(eq(accessCodesRepository.user, user.id))
        .then((result) => result.length > 0)
      // Caso exista, deleta o código de acesso
      if (hasAccessCode) {
        await db.delete(accessCodesRepository).where(eq(accessCodesRepository.user, user.id))
      }

      const accessCode = generateNanoId(6)

      await db.insert(accessCodesRepository).values({
        codeId: generateNanoId(),
        token: accessCode,
        user: user.id,
        type: 'TWO_FACTOR_EMAIL',
      })

      //==== Envia o código de acesso por e-mail
      const mail = await resend.emails.send({
        from: 'UMC - Projeto de Segurança <noreply@rotrenanoliveira.com>',
        to: [user.email],
        subject: 'Código de verificação — login',
        text: [
          `Olá, ${user.name}.`,
          '',
          `Seu código de acesso para concluir o login é: ${accessCode}`,
          '',
          `Ele expira em ${TWO_FACTOR_PENDING_TTL_MIN} minutos. Se você não tentou entrar, altere sua senha.`,
        ].join('\n'),
      })

      if (mail.error) {
        request.log.warn({ userId: user.id, email: user.email }, `Erro ao enviar e-mail: ${mail.error}`)
      }

      console.log(mail.error)

      return reply.send({
        expiresInMinutes: TWO_FACTOR_PENDING_TTL_MIN,
        message: !mail.error
          ? 'Enviamos um código de 6 dígitos para o seu e-mail.'
          : 'SMTP não configurado: o código foi registrado no log do servidor (apenas desenvolvimento).',
      })
    },
  )
}
