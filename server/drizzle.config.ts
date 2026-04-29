import { defineConfig } from 'drizzle-kit'
import { env } from './src/environment-variables'

export default defineConfig({
    dialect: 'postgresql',
    dbCredentials: { url: env.DATABASE_URL },
    out: './drizzle',
    schema: './src/infra/database/schema.ts',
})
