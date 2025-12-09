import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { CheckCircle2, XCircle } from 'lucide-react'
import { GoToLoginButton } from '@/components/GoToLoginButton'

// Página principal (Server Component)
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  // Caso 1: sem token
  if (!token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gray-50 px-4 text-center">
        <XCircle className="h-20 w-20 text-red-500" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Link inválido</h1>
          <p className="mt-3 text-lg text-gray-600">O token de verificação está ausente.</p>
        </div>
        <GoToLoginButton />
      </div>
    )
  }

  // Caso 2: busca token no banco
  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
  })

  if (!verificationToken || verificationToken.expires < new Date()) {
    // Token inválido ou expirado → limpa
    await prisma.verificationToken.deleteMany({ where: { token } }).catch(() => {})

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gray-50 px-4 text-center">
        <XCircle className="h-20 w-20 text-red-500" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Link expirado</h1>
          <p className="mt-3 text-lg text-gray-600">Este link já foi usado ou não é mais válido.</p>
        </div>
        <GoToLoginButton />
      </div>
    )
  }

  // Caso 3: TUDO CERTO → confirma e-mail
  await prisma.user.update({
    where: { email: verificationToken.identifier },
    data: { emailVerified: new Date() },
  })

  await prisma.verificationToken.delete({ where: { token } })

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gray-50 px-4 text-center">
      <CheckCircle2 className="h-20 w-20 text-green-600" />
      <div>
        <h1 className="text-3xl font-bold text-gray-900">E-mail confirmado!</h1>
        <p className="mt-3 text-lg text-gray-600">Sua conta foi ativada com sucesso.</p>
      </div>
      <GoToLoginButton />
    </div>
  )
}