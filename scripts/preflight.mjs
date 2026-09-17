/**
 * Checks the environment before a deploy build starts.
 *
 * Without this, a missing DATABASE_URL surfaces as "The datasource.url property
 * is required in your Prisma config file", which is true and tells you nothing
 * about where to put it. A build that is going to fail should say what to fix
 * and where, in the first few lines of the log.
 */

const REQUIRED = [
  {
    name: 'DATABASE_URL',
    what: 'PostgreSQL connection string',
    how: 'Create a database at neon.tech or supabase.com and paste the connection string. It should end with ?sslmode=require',
  },
  {
    name: 'PHI_ENC_KEY',
    what: '32-byte key, base64, that encrypts patient data',
    how: `Generate once and keep it: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`,
    validate: (v) => {
      const len = Buffer.from(v, 'base64').length
      return len === 32 ? null : `decodes to ${len} bytes, needs to be exactly 32`
    },
  },
  {
    name: 'SESSION_SECRET',
    what: 'signs the sign-in cookie',
    how: `Generate once: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`,
    validate: (v) => (v.length >= 32 ? null : `only ${v.length} characters, use at least 32`),
  },
]

const ADVISORY = [
  {
    when: () => process.env.VERCEL && process.env.STORAGE_DRIVER !== 'db',
    say: 'STORAGE_DRIVER is not set to "db". Serverless hosts have a read-only filesystem, so document uploads will fail. Set STORAGE_DRIVER=db.',
  },
  {
    when: () => process.env.VERCEL && process.env.COOKIE_SECURE === 'false',
    say: 'COOKIE_SECURE=false is set. Vercel serves over HTTPS, so leave it unset and the sign-in cookie is marked Secure automatically.',
  },
  {
    when: () => process.env.SHOW_VERIFICATION_CODE === 'true',
    say: 'SHOW_VERIFICATION_CODE=true shows email verification codes on screen and enables one-click sign-in as the seeded accounts. Fine for a demo, never for real patients.',
  },
]

const problems = []

for (const item of REQUIRED) {
  const value = process.env[item.name]
  if (!value) {
    problems.push({ name: item.name, why: 'is not set', what: item.what, how: item.how })
    continue
  }
  const invalid = item.validate?.(value)
  if (invalid) {
    problems.push({ name: item.name, why: invalid, what: item.what, how: item.how })
  }
}

const notes = ADVISORY.filter((a) => a.when()).map((a) => a.say)

if (problems.length === 0) {
  console.log('preflight: environment looks right')
  for (const note of notes) console.log(`preflight: note — ${note}`)
  process.exit(0)
}

const line = '─'.repeat(72)
console.error(`\n${line}`)
console.error('  This build cannot run yet. Set these and deploy again.')
console.error(`${line}\n`)

for (const p of problems) {
  console.error(`  ${p.name}  —  ${p.why}`)
  console.error(`     what it is:  ${p.what}`)
  console.error(`     how to get:  ${p.how}\n`)
}

if (process.env.VERCEL) {
  console.error('  In Vercel: Settings → Environment Variables → add, then Redeploy.')
  console.error('  Add them to Production, and to Preview if you use preview deployments.\n')
} else {
  console.error('  Locally: copy .env.example to .env and fill it in.\n')
}

for (const note of notes) console.error(`  Also: ${note}\n`)

console.error('  Full walkthrough: docs/DEPLOY-VERCEL.md')
console.error(`${line}\n`)
process.exit(1)
