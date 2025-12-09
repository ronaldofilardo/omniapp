/**
 * Mock de wrapper para testes que precisam de providers (auth, theme, queryClient, etc)
 */

import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

interface TestWrapperProps {
  children: React.ReactNode
}

// Cliente de query compartilhado para testes
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false // Desabilita retries para testes mais rápidos
    },
  },
})

/**
 * TestWrapper que envolve componentes com todos os providers necessários para testes
 */
export function TestWrapper({ children }: TestWrapperProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

/**
 * Hook para criar um wrapper de teste customizado
 */
export function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <TestWrapper>{children}</TestWrapper>
  }
}
