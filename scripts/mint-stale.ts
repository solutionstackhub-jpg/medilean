/** Dev helper: a session cookie for a user id that does not exist. */
import 'dotenv/config'
import { SignJWT } from 'jose'
async function main() {
  const token = await new SignJWT({ role: 'PATIENT' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('cmstaleuser000000000000')
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(new TextEncoder().encode(process.env.SESSION_SECRET!))
  console.log(token)
}
main()
