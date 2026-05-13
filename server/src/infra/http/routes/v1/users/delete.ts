import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { db } from '@/infra/database'
import { accessLogsRepository, usersRepository } from '@/infra/database/repositories'
import { erasureAudit } from '@/infra/http/plugins/logger'
import { resend } from '@/lib/resend'
import { generateCsvData, LGPD_EMAIL_FROM, personalData } from '@/utils/export-personal-data.js'

export async function deleteUser(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().delete(
    '/users/me',
    {
      schema: {
        tags: ['sessions'],
        summary: 'Exclusão dos dados (LGPD)',
        description:
          'Exclui permanentemente o usuário autenticado e os dados vinculados a ele (access_code e sessions ' +
          'por cascata; access_logs com user_id do titular). Opcionalmente envia cópia em CSV por e-mail ' +
          'antes da exclusão (art. 18, II e VI da LGPD). A ação é registrada de forma explícita nos logs da aplicação ' +
          'e no arquivo de access log.',
        body: z.object({
          shouldCopy: z
            .boolean()
            .default(false)
            .describe(
              'Se true, envia para o e-mail da conta o mesmo CSV da rota de exportação antes de apagar os dados.',
            ),
        }),
        response: {
          200: z.object({ message: z.string() }),
          404: z.null(),
          500: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { sub: userId } = await request.jwtVerify<{ sub: string }>()
      const { shouldCopy } = request.body

      const bundle = await personalData(userId)
      if (!bundle) {
        return reply.code(404).send(null)
      }

      const { user, codesRows, sessionsRows, logsRows } = bundle
      const urlPath = request.url.split('?', 1)[0] ?? request.url

      if (shouldCopy) {
        const exportedAt = new Date().toISOString()
        const legalNotice =
          'Cópia enviada imediatamente antes da exclusão definitiva dos dados vinculados a este usuário (LGPD, art. 18, VI).'
        const csv = generateCsvData({
          user,
          codesRows,
          sessionsRows,
          logsRows,
          exportedAt,
          legalNotice,
        })
        const filename = `copia-antes-exclusao-${exportedAt.slice(0, 10)}.csv`

        const mail = await resend.emails.send({
          from: LGPD_EMAIL_FROM,
          to: [user.email],
          subject: 'Cópia dos seus dados antes da exclusão (LGPD)',
          text: [
            `Olá, ${user.name}.`,
            '',
            'Em anexo está o CSV com os dados que serão excluídos em seguida, conforme a sua solicitação e o art. 18 da LGPD.',
            '',
            legalNotice,
            '',
            `Gerado em: ${new Date(exportedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'long', timeStyle: 'short' })}`,
          ].join('\n'),
          attachments: [
            {
              filename,
              content: Buffer.from(csv, 'utf8'),
              contentType: 'text/csv; charset=utf-8',
            },
          ],
        })

        if (mail.error) {
          request.log.error(
            { err: mail.error, userId },
            'Falha ao enviar cópia LGPD antes da exclusão; exclusão não realizada.',
          )
          return reply.status(500).send({
            error: `Não foi possível enviar o e-mail com a cópia: ${mail.error.message}. Nenhum dado foi apagado.`,
          })
        }
      }

      await db.transaction(async (tx) => {
        await tx.delete(accessLogsRepository).where(eq(accessLogsRepository.userId, userId))
        await tx.delete(usersRepository).where(eq(usersRepository.id, userId))
      })

      request.log.warn(
        {
          lgpd: true,
          action: 'data_subject_erasure_completed',
          userId,
          sendCopyBeforeDelete: shouldCopy,
          ip: request.ip,
        },
        'LGPD: exclusão dos dados concluída pelo titular (art. 18, VI).',
      )

      await erasureAudit({
        userId,
        ip: request.ip,
        sendCopyBeforeDelete: shouldCopy,
        method: request.method,
        urlPath,
        statusCode: 200,
      })

      return reply.status(200).send({
        message: shouldCopy
          ? 'Enviamos a cópia em CSV para o seu e-mail e excluímos sua conta e os dados vinculados.'
          : 'Sua conta e os dados vinculados foram excluídos.',
      })
    },
  )
}
