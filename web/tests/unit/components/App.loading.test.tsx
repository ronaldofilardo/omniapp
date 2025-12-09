

import { render, screen, act, waitFor } from '@testing-library/react'
import App from '@/components/App'
import { describe, it, expect, vi } from 'vitest'

// Testa se o spinner de loading aparece enquanto verifica autenticação

describe('App loading', () => {
  it('exibe spinner de loading enquanto verifica autenticação', async () => {
    window.localStorage.clear()
    render(<App authDelayMs={100} />)
    // O spinner deve aparecer imediatamente
    expect(screen.getByText(/carregando/i)).toBeInTheDocument()
    // Aguarda o loading sumir e a tela de login aparecer
    await waitFor(() => {
      expect(screen.getByPlaceholderText('usuário@email.com')).toBeInTheDocument()
    })
  })
})

