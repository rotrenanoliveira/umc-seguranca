import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { resend } from '@/lib/resend'
import { generateCsvData, LGPD_EMAIL_FROM, personalData } from '@/utils/export-personal-data'

export async function getPersonalData(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/sessions/me/personal-data',
    {
      schema: {
        tags: ['sessions'],
        summary: 'Dados pessoais (LGPD)',
        description:
          'Gera um arquivo CSV com cópia dos dados pessoais do titular nas tabelas em que o usuário aparece ' +
          '(users, access_code, sessions, access_logs) e envia por e-mail para o endereço da conta. ' +
          'Atende ao direito de confirmação da existência de tratamento e acesso (LGPD, art. 18, I e II). ' +
          'Credenciais internas (hash de senha e hash do token de atualização) não são incluídas.',
        response: {
          200: z.object({
            message: z.string(),
          }),
          404: z.null(),
          500: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { sub: userId } = await request.jwtVerify<{ sub: string }>()

      const bundle = await personalData(userId)
      if (!bundle) {
        return reply.code(404).send(null)
      }

      const { user, codesRows, sessionsRows, logsRows } = bundle

      const exportedAt = new Date().toISOString()
      const legalNotice = 'Exportação dos dados vinculados ao seu usuário.'

      const csv = generateCsvData({
        user,
        codesRows,
        sessionsRows,
        logsRows,
        exportedAt,
        legalNotice,
      })

      const filename = `exportacao-dados-pessoais-${exportedAt.slice(0, 10)}.csv`

      const mail = await resend.emails.send({
        from: LGPD_EMAIL_FROM,
        to: [user.email],
        subject: 'Exportação dos seus dados pessoais (LGPD)',
        text: [
          `Olá, ${user.name}.`,
          '',
          'Segue em anexo o arquivo CSV com a cópia dos seus dados tratados por este sistema, conforme o art. 18 da LGPD.',
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
        request.log.error({ err: mail.error, userId }, 'Falha ao enviar exportação LGPD por e-mail')
        return reply.status(500).send({
          error: `Não foi possível enviar o e-mail com o arquivo: ${mail.error.message}.`,
        })
      }

      return reply.status(200).send({
        message: 'Enviamos o arquivo CSV com seus dados pessoais para o e-mail da sua conta.',
      })
    },
  )
}
