'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface User {
  id: string
  email: string
  cpf: string | null
  name: string | null
  role: 'EMISSOR' | 'RECEPTOR' | 'ADMIN'
  createdAt: string
  emissorInfo: {
    cnpj: string | null
  } | null
}

export function UsersTab() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (!response.ok) {
        throw new Error('Erro ao buscar usuários')
      }
      const data = await response.json()
      setUsers(data.users || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-lg text-[#111827]">Carregando...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-red-500">Erro: {error}</div>
      </div>
    )
  }

  return (
    <div className="max-w-[95%] mx-auto px-4 pb-3">
      <Card className="border-[#E5E7EB] shadow-sm">
        <CardHeader className="border-b border-[#E5E7EB] bg-white py-3 px-4">
          <CardTitle className="text-base font-semibold text-[#111827]">
            Usuários do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="bg-white p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  <TableHead className="text-[#111827] font-semibold text-xs py-3 px-3">Nome</TableHead>
                  <TableHead className="text-[#111827] font-semibold text-xs py-3 px-3">E-mail</TableHead>
                  <TableHead className="text-[#111827] font-semibold text-xs py-3 px-3">Registro</TableHead>
                  <TableHead className="text-[#111827] font-semibold text-xs py-3 px-3">Tipo</TableHead>
                  <TableHead className="text-[#111827] font-semibold text-xs py-3 px-3">Data de Criação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user, index) => (
                  <TableRow 
                    key={user.id}
                    className={`border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'
                    }`}
                  >
                    <TableCell className="text-[#111827] font-medium text-sm py-3 px-3">
                      {user.name || '—'}
                    </TableCell>
                    <TableCell className="text-[#374151] text-sm py-3 px-3">{user.email}</TableCell>
                    <TableCell className="text-[#374151] text-sm py-3 px-3">
                      {user.role === 'EMISSOR' ? (user.emissorInfo?.cnpj || '—') : (user.cpf || '—')}
                    </TableCell>
                    <TableCell className="py-3 px-3">
                      <Badge 
                        variant="default"
                        className={`text-xs px-2 py-1 ${
                          user.role === 'EMISSOR' 
                            ? 'bg-[#3B82F6] text-white hover:bg-[#2563EB]' 
                            : user.role === 'RECEPTOR'
                            ? 'bg-[#10B981] text-white hover:bg-[#059669]'
                            : 'bg-[#6B7280] text-white hover:bg-[#4B5563]'
                        }`}
                      >
                        {user.role === 'EMISSOR' ? 'Emissor' : user.role === 'RECEPTOR' ? 'Receptor' : 'Admin'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#374151] text-sm py-3 px-3 whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString('pt-BR', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric' 
                      })}
                      {' '}
                      {new Date(user.createdAt).toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {users.length === 0 && (
              <div className="text-center py-8 text-[#6B7280] text-sm">
                Nenhum usuário encontrado.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
