import 'dotenv/config'
import { defineConfig } from 'prisma/config'

/**
 * The connection string may arrive under a different name depending on how the
 * database was attached — see src/lib/database-url.ts. Kept inline because this
 * file is loaded by the Prisma CLI before the app's module aliases exist.
 */
const CANDIDATES = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'STORAGE_URL',
  'POSTGRES_PRISMA_URL',
  'DATABASE_POSTGRES_URL',
  'NEON_DATABASE_URL',
  'DATABASE_URL_UNPOOLED',
  'POSTGRES_URL_NON_POOLING',
]

const url = CANDIDATES.map((n) => process.env[n]).find((v) => v?.startsWith('postgres'))

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url },
})
