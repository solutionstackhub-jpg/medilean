import { Suspense } from 'react'
import { demoLoginEnabled } from '@/actions/auth'
import LoginForm from './LoginForm'

export default async function LoginPage() {
  const demo = await demoLoginEnabled()
  return (
    <Suspense>
      <LoginForm demo={demo} />
    </Suspense>
  )
}
