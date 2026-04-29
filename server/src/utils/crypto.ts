import crypto from 'node:crypto'
import { env } from '@/environment-variables'

const ALGORITHM = 'aes-256-cbc'
const KEY = Buffer.from(env.ENCRYPTION_KEY, 'hex')

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
  let encrypted = cipher.update(text, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(encryptedText: string): string {
  const [ivHex, encryptedHex] = encryptedText.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
  let decrypted = decipher.update(encrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString('utf8')
}
