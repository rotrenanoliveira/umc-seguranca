import { boolean, customType, integer, pgEnum, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { generateNanoId } from '@/lib/nanoid'
import { decrypt, encrypt } from '@/utils/crypto';

export const accessCodeTypeEnum = pgEnum('code_type', ['PASSWORD_RESET', 'TWO_FACTOR_PENDING', 'TWO_FACTOR_EMAIL'])

const encryptedText = customType<{ data: string }>({
  dataType() { return 'text'; },
  toDriver(value: unknown) {
    if (typeof value !== 'string') {
      throw new TypeError('Erro ao converter/encriptar para driver')
    }
    return encrypt(value)
  },
  fromDriver(value: unknown) {
    if (typeof value !== 'string') {
      throw new TypeError('Erro ao converter/descriptografar do driver')
    }
    return decrypt(value)
  }
});

export const users = pgTable('users', {
  id: text('user_id')
    .primaryKey()
    .$defaultFn(() => generateNanoId()),
  email: text().notNull().unique(),
  name: encryptedText('name').notNull(),
  password: text().notNull(),
  /** Número de tentativas de login falhadas. */
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  /** 2FA: código numérico enviado por e-mail a cada login. */
  twoFactorEmailEnabled: boolean('two_factor_email_enabled').notNull().default(true),
  consentAt: timestamp('consent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .$defaultFn(() => new Date()),
})

export const accessCodes = pgTable(
  'access_code',
  {
    codeId: text('code_id').notNull().primaryKey(),
    user: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: encryptedText('token').notNull(),
    type: accessCodeTypeEnum('type').notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex().on(table.token, table.user)],
)

export const sessions = pgTable('sessions', {
  id: text('session_id').primaryKey().notNull(),
  user: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  refreshTokenHash: text('refresh_token_hash').unique(),
  issuedAt: timestamp('issued_at').notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  revokedAt: timestamp('revoked_at'),
})

export type User = typeof users.$inferSelect
export type AccessCode = typeof accessCodes.$inferSelect
export type Session = typeof sessions.$inferSelect
