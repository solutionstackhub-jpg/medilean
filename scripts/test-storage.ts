/** Dev helper: prove both storage drivers round-trip and stay encrypted. */
import 'dotenv/config'
import { newStorageKey, putObject, getObject, deleteObject } from '../src/lib/storage'

async function run(driver: 'local' | 'db') {
  process.env.STORAGE_DRIVER = driver
  const key = newStorageKey()
  const payload = Buffer.from('lab report body — pretend PHI')
  await putObject(key, payload)
  const back = await getObject(key)
  const ok = back?.equals(payload) ?? false
  await deleteObject(key)
  const gone = (await getObject(key)) === null
  console.log(`  ${driver.padEnd(6)} round-trip: ${ok ? 'OK' : 'FAIL'}   delete: ${gone ? 'OK' : 'FAIL'}`)
}

async function main() {
  await run('local')
  await run('db')
  process.exit(0)
}
main()
