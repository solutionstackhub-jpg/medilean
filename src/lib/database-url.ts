/**
 * Finds the Postgres connection string, whatever the host decided to call it.
 *
 * Vercel's database integrations name the variable after a prefix you choose
 * when connecting, and they reject some prefixes — including "DATABASE" — so
 * you can easily end up with STORAGE_URL or POSTGRES_URL and an application
 * that only looks for DATABASE_URL. That is a deploy failure caused by nothing
 * but a name, so the application looks for the usual ones instead of insisting.
 *
 * DATABASE_URL still wins when it is set.
 */
const CANDIDATES = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'STORAGE_URL',
  'POSTGRES_PRISMA_URL',
  'DATABASE_POSTGRES_URL',
  'NEON_DATABASE_URL',
  // Unpooled last: it works, but a pooled URL is the better default on serverless.
  'DATABASE_URL_UNPOOLED',
  'POSTGRES_URL_NON_POOLING',
]

export function resolveDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  for (const name of CANDIDATES) {
    const value = env[name]
    if (value && value.startsWith('postgres')) return value
  }
  return undefined
}

/** Which variable the value came from, for error messages and logs. */
export function databaseUrlSource(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return CANDIDATES.find((n) => env[n]?.startsWith('postgres'))
}

export const DATABASE_URL_CANDIDATES = CANDIDATES
