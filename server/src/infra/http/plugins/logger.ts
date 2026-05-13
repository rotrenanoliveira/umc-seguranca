import { once } from 'node:events'
import { createWriteStream, mkdirSync, type WriteStream } from 'node:fs'
import { join, resolve } from 'node:path'
import type { FastifyInstance } from 'fastify'
import fastifyPlugin from 'fastify-plugin'
import { db } from '@/infra/database'
import { accessLogsRepository } from '@/infra/database/repositories'

let activeStream: WriteStream | null = null
let activeDay: string | null = null

function dayStamp(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function logDir(): string {
  const dir = process.env.ACCESS_LOG_DIR?.trim() || 'log'
  return resolve(process.cwd(), dir)
}

function filePath(day: string): string {
  return join(logDir(), `access-${day}.log`)
}

function getStream(now: Date): WriteStream {
  const day = dayStamp(now)

  if (activeStream && activeDay === day) {
    return activeStream
  }

  if (activeStream) {
    activeStream.end()
    activeStream = null
    activeDay = null
  }

  const dir = logDir()

  mkdirSync(dir, { recursive: true })

  const logPath = filePath(day)
  const ws = createWriteStream(logPath, { flags: 'a' })

  ws.on('error', (err) => {
    console.error('[access-log] write stream error:', err)
  })

  activeStream = ws
  activeDay = day

  return ws
}

export function closeStream(): void {
  if (activeStream) {
    activeStream.end()
    activeStream = null
    activeDay = null
  }
}

function getBearerToken(authorization: string | undefined): string | null {
  if (!authorization || !/^Bearer\s/i.test(authorization)) {
    return null
  }
  const parts = authorization.split(' ')
  return parts.length === 2 ? (parts[1] ?? null) : null
}

type ErasureAuditParams = {
  userId: string
  ip: string
  sendCopyBeforeDelete: boolean
  method: string
  urlPath: string
  statusCode: number
}
/**
 * Registro explícito no arquivo de access log (além do hook onResponse), para auditoria LGPD:
 * confirma que o titular identificado por `userId` concluiu a exclusão dos seus dados.
 */
export async function erasureAudit(params: ErasureAuditParams): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    return
  }

  const now = new Date()
  const ws = getStream(now)
  const iso = now.toISOString()
  const line =
    `[${iso}]:LGPD:EXCLUSAO_DADOS_CONCLUIDA,made_by:${params.userId},` +
    `sendCopyBeforeDelete:${params.sendCopyBeforeDelete},` +
    `${params.method}:${params.urlPath},status_code:${params.statusCode},ip:${params.ip}\n`

  if (!ws.write(line)) {
    await once(ws, 'drain')
  }
}

export const logger = fastifyPlugin(async (app: FastifyInstance) => {
  if (process.env.NODE_ENV === 'test') {
    return
  }

  app.addHook('onClose', async () => closeStream())

  app.addHook('onResponse', async (request, reply) => {
    const now = new Date()
    const urlPath = request.url.split('?', 1)[0] ?? request.url

    const token = getBearerToken(request.headers.authorization)
    const decoded = token ? app.jwt.decode<{ sub?: string }>(token) : null
    const userId = decoded?.sub ?? null

    const record = {
      method: request.method,
      url: urlPath,
      statusCode: reply.statusCode,
      ip: request.ip,
      userId: userId ?? null,
      timestamp: now.toISOString(),
      // timestamp: now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    }

    const ws = getStream(now)
    const line = `[${record.timestamp}]:${record.method}:${record.url}, status_code:${record.statusCode}, made_by:${record.userId} on IP:${record.ip} \n`

    await db.insert(accessLogsRepository).values(record)

    if (!ws.write(line)) {
      await once(ws, 'drain')
    }
  })
})
