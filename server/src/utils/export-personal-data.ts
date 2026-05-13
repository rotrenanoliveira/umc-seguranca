import { eq } from 'drizzle-orm'
import { db } from '@/infra/database'
import {
  accessCodesRepository,
  accessLogsRepository,
  sessionsRepository,
  usersRepository,
} from '@/infra/database/repositories'
import type { AccessCode, AccessLog, Session, User } from '@/infra/database/schema'

export const LGPD_EMAIL_FROM = 'UMC - Projeto de Segurança <noreply@rotrenanoliveira.com>'

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

export type PersonalDataExport = {
  user: Omit<User, 'password'>
  codesRows: AccessCode[]
  sessionsRows: Omit<Session, 'refreshTokenHash'>[]
  logsRows: AccessLog[]
}

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

export function generateCsvData(params: {
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

export async function personalData(userId: string): Promise<PersonalDataExport | null> {
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
    return null
  }

  return { user, codesRows, sessionsRows, logsRows }
}
