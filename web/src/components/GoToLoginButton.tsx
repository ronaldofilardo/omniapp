'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export function GoToLoginButton() {
  const router = useRouter()
  return (
    <Button
      onClick={() => router.push('/login')}
      className="bg-green-600 hover:bg-green-700 text-white font-medium px-8 py-6 text-lg"
    >
      Ir para o login
    </Button>
  )
}