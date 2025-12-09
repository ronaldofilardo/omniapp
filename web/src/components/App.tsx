'use client'
import { useState, useEffect } from 'react'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { CreateUserModal } from './CreateUserModal'
import { Dashboard } from './Dashboard'


type AppProps = {
  authDelayMs?: number
}

export default function App({ authDelayMs }: AppProps = {}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userId, setUserId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  // Carregar estado da autenticação do localStorage ao montar o componente
  useEffect(() => {
    const runAuth = () => {
      const storedIsLoggedIn = localStorage.getItem('isLoggedIn')
      const storedUserId = localStorage.getItem('userId')
      const storedEmail = localStorage.getItem('userEmail')
      if (storedIsLoggedIn === 'true' && storedUserId && storedEmail) {
        setIsLoggedIn(true)
        setUserId(storedUserId)
        setEmail(storedEmail)
      }
      setIsLoading(false)
    }
    if (authDelayMs && authDelayMs > 0) {
      const t = setTimeout(runAuth, authDelayMs)
      return () => clearTimeout(t)
    } else {
      runAuth()
    }
  }, [authDelayMs])

  const handleLogin = async () => {
    // Handle login logic here
    console.log('Login attempt:', { email, password })
    // Buscar o id do usuário pelo e-mail
    try {
      const res = await fetch(`/api/users/by-email?email=${encodeURIComponent(email)}`)
      if (!res.ok) throw new Error('Usuário não encontrado')
      const data = await res.json()
      if (!data.id) throw new Error('ID do usuário não encontrado')

      // Salvar no localStorage
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('userId', data.id)
      localStorage.setItem('userEmail', email)

      setUserId(data.id)
      setIsLoggedIn(true)
    } catch (err) {
      alert('Erro ao autenticar: ' + (err instanceof Error ? err.message : err))
    }
  }

  const handleLogout = () => {
    // Limpar localStorage
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userId')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('activeMenu')

    setIsLoggedIn(false)
    setEmail('')
    setPassword('')
    setUserId('')
  }

  const handleNewUser = () => {
    setIsCreateUserModalOpen(true)
  }

  const handleRegistered = async (u: { email: string; name?: string }) => {
    // Preenche o login e autentica automaticamente para agilizar o fluxo de desenvolvimento
    setEmail(u.email)
    setPassword('')
    setIsCreateUserModalOpen(false)
    // Buscar o id do usuário recém-criado
    try {
      const res = await fetch(`/api/users/by-email?email=${encodeURIComponent(u.email)}`)
      if (!res.ok) throw new Error('Usuário não encontrado')
      const data = await res.json()
      if (!data.id) throw new Error('ID do usuário não encontrado')

      // Salvar no localStorage
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('userId', data.id)
      localStorage.setItem('userEmail', u.email)

      setUserId(data.id)
      setIsLoggedIn(true)
    } catch (err) {
      alert('Erro ao autenticar: ' + (err instanceof Error ? err.message : err))
    }
  }

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#10b981] mx-auto"></div>
          <p className="mt-4 text-[#666666]">Carregando...</p>
        </div>
      </div>
    )
  }

  // Show Dashboard if logged in
    if (isLoggedIn) {
      return <Dashboard onLogout={handleLogout} userId={userId} userRole="RECEPTOR" />
    }

  // Show Login Screen
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow-lg p-10 w-[350px]">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img src="/logo.svg" alt="Logo Omni Saúde" className="h-16 w-auto" />
        </div>
        {/* Title */}
        <h1 className="text-center text-[#1a1a1a] mb-2">Omni Saúde</h1>
        {/* Subtitle */}
        <p className="text-center text-[#666666] mb-8">Tudo em Suas mãos</p>
        {/* Email Input */}
        <div className="mb-4">
          <Input
            type="email"
            placeholder="usuário@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 bg-[#F3F4F6] border border-[#D1D5DB] rounded px-3 py-2 text-sm text-[#6B7280] focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[#9CA3AF]"
          />
        </div>
        {/* Password Input */}
        <div className="mb-4">
          <Input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 bg-[#F3F4F6] border border-[#D1D5DB] rounded px-3 py-2 text-sm text-[#6B7280] focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[#9CA3AF]"
          />
        </div>
        {/* Login Button */}
        <Button
          onClick={handleLogin}
          className="w-full h-12 bg-[#10b981] hover:bg-[#059669] text-white rounded-lg mb-4"
        >
          Entrar
        </Button>
        {/* New User Button */}
        <Button
          onClick={handleNewUser}
          className="w-full h-12 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg"
        >
          Novo Usuário
        </Button>
      </div>
      {/* Create User Modal */}
      <CreateUserModal
        open={isCreateUserModalOpen}
        onOpenChange={setIsCreateUserModalOpen}
        onRegistered={handleRegistered}
      />
    </div>
  )
}
