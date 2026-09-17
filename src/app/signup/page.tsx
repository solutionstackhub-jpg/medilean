import OnboardShell from '@/components/OnboardShell'
import SignUpForm from './SignUpForm'

export default function SignUpPage() {
  return (
    <OnboardShell step={1} title="Create Your Account" subtitle="Start your journey to a healthier you.">
      <SignUpForm />
    </OnboardShell>
  )
}
