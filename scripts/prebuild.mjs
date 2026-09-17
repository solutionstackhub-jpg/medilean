/**
 * Runs before `next build`, in every environment.
 *
 * It lives in the `build` script rather than `vercel-build` on purpose. Which
 * of the two a host actually invokes is not always obvious, and a build step
 * that silently does not run is worse than one that fails: the deploy looks
 * fine and the application is broken at runtime.
 *
 * What it does depends on where it runs:
 *
 *   locally     checks the environment, warns, and never touches the database.
 *               `npm run verify` must not migrate your development data.
 *   deploying   checks strictly, then applies pending migrations.
 */

import { spawnSync } from 'node:child_process'

// Load .env when there is one, so a local build sees the same values the app
// will. On a host there is no .env file and this does nothing; the platform's
// own environment variables are already in process.env.
try {
  await import('dotenv/config')
} catch {
  // dotenv is a dev dependency. Its absence is not a problem.
}

const DEPLOYING = Boolean(process.env.VERCEL || process.env.CI || process.env.DEPLOY === 'true')
const WHERE = process.env.VERCEL ? 'Vercel' : process.env.CI ? 'CI' : 'local'

console.log(`\n▸ prebuild (${WHERE})`)

// ------------------------------------------------------------------ checks

const REQUIRED = [
  {
    name: 'DATABASE_URL',
    what: 'PostgreSQL connection string',
    how: 'Create a database at neon.tech or supabase.com and paste the connection string. It should end with ?sslmode=require',
  },
  {
    name: 'PHI_ENC_KEY',
    what: '32-byte key, base64, that encrypts patient data',
    how: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`,
    validate: (v) => {
      const len = Buffer.from(v, 'base64').length
      return len === 32 ? null : `decodes to ${len} bytes, needs to be exactly 32`
    },
  },
  {
    name: 'SESSION_SECRET',
    what: 'signs the sign-in cookie',
    how: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`,
    validate: (v) => (v.length >= 32 ? null : `only ${v.length} characters, use at least 32`),
  },
]

const problems = []
for (const item of REQUIRED) {
  const value = process.env[item.name]
  if (!value) {
    problems.push({ ...item, why: 'is not set' })
    continue
  }
  const invalid = item.validate?.(value)
  if (invalid) problems.push({ ...item, why: invalid })
}

const advisories = []
if (DEPLOYING && process.env.STORAGE_DRIVER !== 'db') {
  advisories.push('STORAGE_DRIVER is not "db". A serverless host has a read-only filesystem, so document uploads will fail at runtime. Set STORAGE_DRIVER=db.')
}
if (process.env.VERCEL && process.env.COOKIE_SECURE === 'false') {
  advisories.push('COOKIE_SECURE=false is set. Vercel serves over HTTPS — leave it unset so the sign-in cookie is marked Secure.')
}
if (DEPLOYING && process.env.SHOW_VERIFICATION_CODE === 'true') {
  advisories.push('SHOW_VERIFICATION_CODE=true shows verification codes on screen and enables one-click sign-in as the seeded accounts. Fine for a demo, never for real patients.')
}

if (problems.length && DEPLOYING) {
  const line = '─'.repeat(72)
  console.error(`\n${line}`)
  console.error('  This deploy cannot run yet. Set these and deploy again.')
  console.error(`${line}\n`)
  for (const p of problems) {
    console.error(`  ${p.name}  —  ${p.why}`)
    console.error(`     what it is:  ${p.what}`)
    console.error(`     how to get:  ${p.how}\n`)
  }
  if (process.env.VERCEL) {
    console.error('  In Vercel: Settings → Environment Variables → add them to Production,')
    console.error('  then Deployments → ⋯ → Redeploy.\n')
  }
  for (const a of advisories) console.error(`  Also: ${a}\n`)
  console.error('  Full walkthrough: docs/DEPLOY-VERCEL.md')
  console.error(`${line}\n`)
  process.exit(1)
}

if (problems.length) {
  console.log('  environment is incomplete, which is fine for a local build:')
  for (const p of problems) console.log(`    ${p.name} — ${p.why}`)
} else {
  console.log('  environment looks right')
}
for (const a of advisories) console.log(`  note: ${a}`)

// -------------------------------------------------------------- migrations

if (!DEPLOYING) {
  console.log('  skipping migrations (not a deploy)\n')
  process.exit(0)
}

console.log('  applying database migrations')
const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  env: process.env,
})

if (result.status !== 0) {
  console.error('\n  Migrations failed. The usual causes:')
  console.error('    - DATABASE_URL points somewhere unreachable from the build machine')
  console.error('    - the database rejects the connection (check ?sslmode=require)')
  console.error('    - the credentials in the URL are wrong\n')
  process.exit(result.status ?? 1)
}

console.log('  migrations applied\n')
