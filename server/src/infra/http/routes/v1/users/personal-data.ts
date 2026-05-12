import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { db } from '@/infra/database'
import {
  accessCodesRepository,
  accessLogsRepository,
  sessionsRepository,
  usersRepository,
} from '@/infra/database/repositories'
import type { AccessCode, AccessLog, Session, User } from '@/infra/database/schema'
import { resend } from '@/lib/resend'

const EMAIL_FROM = 'UMC - Projeto de Segurança <noreply@rotrenanoliveira.com>'

const CSV_HEADERS = [
  'secao',
  'users_id',
  'users_email',
  'users_name',
  'users_failedLoginAttempts',
  'users_lockedUntil',
  'users_twoFactorEmailEnabled',
  'users_consentAt',
  'users_createdAt',
  'users_updatedAt',
  'accessCodes_codeId',
  'accessCodes_userId',
  'accessCodes_token',
  'accessCodes_type',
  'accessCodes_usedAt',
  'accessCodes_createdAt',
  'sessions_id',
  'sessions_userId',
  'sessions_issuedAt',
  'sessions_lastSeenAt',
  'sessions_expiresAt',
  'sessions_revokedAt',
  'accessLogs_id',
  'accessLogs_userId',
  'accessLogs_ip',
  'accessLogs_method',
  'accessLogs_url',
  'accessLogs_statusCode',
  'accessLogs_createdAt',
] as const

function toIso(value: Date | null | undefined): string | null {
  if (value == null) {
    return null
  }
  return value.toISOString()
}

function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }
  const s = String(value)
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function csvLine(values: readonly (string | number | boolean | null | undefined)[]): string {
  return values.map(csvEscape).join(',')
}

function generateCsvData(params: {
  user: Omit<User, 'password'>
  codesRows: AccessCode[]
  sessionsRows: Omit<Session, 'refreshTokenHash'>[]
  logsRows: AccessLog[]
  exportedAt: string
  legalNotice: string
}): string {
  const lines: string[] = [csvLine([...CSV_HEADERS])]

  lines.push(
    csvLine([
      'users',
      params.user.id,
      params.user.email,
      params.user.name,
      params.user.failedLoginAttempts,
      toIso(params.user.lockedUntil) ?? '',
      params.user.twoFactorEmailEnabled,
      toIso(params.user.consentAt) ?? '',
      params.user.createdAt.toISOString(),
      params.user.updatedAt.toISOString(),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ]),
  )

  for (const row of params.codesRows) {
    lines.push(
      csvLine([
        'access_codes',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        row.codeId,
        row.user,
        row.token,
        row.type,
        toIso(row.usedAt) ?? '',
        row.createdAt.toISOString(),
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ]),
    )
  }

  for (const row of params.sessionsRows) {
    lines.push(
      csvLine([
        'sessions',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        row.id,
        row.user,
        row.issuedAt.toISOString(),
        row.lastSeenAt.toISOString(),
        row.expiresAt.toISOString(),
        toIso(row.revokedAt) ?? '',
        '',
        '',
        '',
        '',
        '',
        '',
      ]),
    )
  }

  for (const row of params.logsRows) {
    lines.push(
      csvLine([
        'access_logs',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        row.id,
        row.userId ?? '',
        row.ip,
        row.method,
        row.url,
        row.statusCode,
        row.createdAt.toISOString(),
      ]),
    )
  }

  const metaBlock = [
    csvLine(['#meta', 'chave', 'valor']),
    csvLine(['#meta', 'exportadoEm', params.exportedAt]),
    csvLine(['#meta', 'avisoLegal', params.legalNotice]),
    '',
  ].join('\n')

  return `\uFEFF${metaBlock}${lines.join('\n')}`
}

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

      const [userRows, codesRows, sessionsRows, logsRows] = await Promise.all([
        db
          .select({
            id: usersRepository.id,
            email: usersRepository.email,
            name: usersRepository.name,
            failedLoginAttempts: usersRepository.failedLoginAttempts,
            lockedUntil: usersRepository.lockedUntil,
            twoFactorEmailEnabled: usersRepository.twoFactorEmailEnabled,
            consentAt: usersRepository.consentAt,
            createdAt: usersRepository.createdAt,
            updatedAt: usersRepository.updatedAt,
          })
          .from(usersRepository)
          .where(eq(usersRepository.id, userId)),
        db.select().from(accessCodesRepository).where(eq(accessCodesRepository.user, userId)),
        db
          .select({
            id: sessionsRepository.id,
            user: sessionsRepository.user,
            issuedAt: sessionsRepository.issuedAt,
            lastSeenAt: sessionsRepository.lastSeenAt,
            expiresAt: sessionsRepository.expiresAt,
            revokedAt: sessionsRepository.revokedAt,
          })
          .from(sessionsRepository)
          .where(eq(sessionsRepository.user, userId)),
        db.select().from(accessLogsRepository).where(eq(accessLogsRepository.userId, userId)),
      ])

      const user = userRows[0]
      if (!user) {
        return reply.code(404).send(null)
      }

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
        from: EMAIL_FROM,
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
