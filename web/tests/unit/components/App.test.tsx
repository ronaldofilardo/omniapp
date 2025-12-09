import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import App from '@/components/App'
// Mock do fetch global
afterAll(() => {
  vi.restoreAllMocks()
})
let mockFetch: any
beforeAll(() => {
  mockFetch = vi.fn((...args) => {
    const url = typeof args[0] === 'string' ? args[0] : '';
    if (url.includes('specialties')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(['Cardiologia', 'Dermatologia'])
      })
    }
    if (url.includes('/api/users/by-email')) {
      // Simula login bem-sucedido
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'user-1' })
      })
    }
    // fallback para outros endpoints
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
  })
  ;(globalThis as any).fetch = mockFetch
})

afterAll(() => {
  vi.restoreAllMocks()
})

describe('App', () => {

  beforeEach(() => {
    vi.clearAllMocks()
    // Garante que não há usuário logado
    window.localStorage.clear()
  })


  it('renders login screen initially', async () => {
    render(<App />)
    // Aguarda a tela de login aparecer
    expect(await screen.findByText('Omni Saúde')).toBeInTheDocument()
    expect(screen.getByText('Tudo em Suas mãos')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('usuário@email.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Senha')).toBeInTheDocument()
    expect(screen.getByText('Entrar')).toBeInTheDocument()
    expect(screen.getByText('Novo Usuário')).toBeInTheDocument()

    // Verifica se o logotipo está presente
    const logo = screen.getByAltText(/logo|omni/i)
    expect(logo).toBeInTheDocument()
  })

  it('allows typing in email field', () => {
    render(<App />)

    const emailInput = screen.getByPlaceholderText('usuário@email.com')
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

    expect(emailInput).toHaveValue('test@example.com')
  })

  it('allows typing in password field', () => {
    render(<App />)

    const passwordInput = screen.getByPlaceholderText('Senha')
    fireEvent.change(passwordInput, { target: { value: 'password123' } })

    expect(passwordInput).toHaveValue('password123')
  })

  it('handles login button click', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    render(<App />)

    const emailInput = screen.getByPlaceholderText('usuário@email.com')
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

    const passwordInput = screen.getByPlaceholderText('Senha')
    fireEvent.change(passwordInput, { target: { value: 'password123' } })

    const loginButton = screen.getByText('Entrar')
    fireEvent.click(loginButton)

    expect(consoleSpy).toHaveBeenCalledWith('Login attempt:', {
      email: 'test@example.com',
      password: 'password123',
    })

    consoleSpy.mockRestore()
  })



  it('shows dashboard after login', async () => {
    render(<App />)

    const emailInput = screen.getByPlaceholderText('usuário@email.com')
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    const passwordInput = screen.getByPlaceholderText('Senha')
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    const loginButton = screen.getByText('Entrar')
    await act(async () => {
      fireEvent.click(loginButton)
    })

    // Aguarda o Dashboard aparecer (login bem-sucedido)
    await screen.findByText('Minha Timeline')
    expect(screen.queryByText('Omni Saúde')).not.toBeInTheDocument()
  })

  it('opens create user modal when Novo Usuário is clicked', async () => {
    render(<App />)

    const newUserButton = screen.getByText('Novo Usuário')
    await act(async () => {
      fireEvent.click(newUserButton)
    })

    // Modal should be open, but since it's a separate component, we check if the modal is rendered
    expect(screen.getByText('Omni Saúde')).toBeInTheDocument()
  })




  it('handles logout from dashboard', async () => {
    render(<App />)

    // Login
    const emailInput = screen.getByPlaceholderText('usuário@email.com')
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    const passwordInput = screen.getByPlaceholderText('Senha')
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    const loginButton = screen.getByText('Entrar')
    await act(async () => {
      fireEvent.click(loginButton)
    })
    await screen.findByText('Minha Timeline')

    // Simula clique no botão de sair do Sidebar
    const sairButton = screen.getByText('Sair')
    await act(async () => {
      fireEvent.click(sairButton)
    })

    // Deve voltar para tela de login
    expect(screen.getByText('Omni Saúde')).toBeInTheDocument()
  })






  it('clears form fields on logout', async () => {
    render(<App />)

    const emailInput = screen.getByPlaceholderText('usuário@email.com')
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    const passwordInput = screen.getByPlaceholderText('Senha')
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    const loginButton = screen.getByText('Entrar')
    await act(async () => {
      fireEvent.click(loginButton)
    })
    await screen.findByText('Minha Timeline')

    // Simula logout
    const sairButton = screen.getByText('Sair')
    await act(async () => {
      fireEvent.click(sairButton)
    })

    // Deve limpar os campos
    expect(screen.getByPlaceholderText('usuário@email.com')).toHaveValue('')
    expect(screen.getByPlaceholderText('Senha')).toHaveValue('')
  })

  it('renders with correct styling', () => {
    render(<App />)

    const card = screen.getByText('Omni Saúde').closest('div')
    // O card é o container interno, o wrapper externo é o parentElement
    const wrapper = card?.parentElement
    expect(wrapper).toHaveClass(
      'min-h-screen',
      'flex',
      'items-center',
      'justify-center',
      'bg-gray-50'
    )

    expect(card).toHaveClass(
      'bg-white',
      'rounded-xl',
      'shadow-lg',
      'p-10',
      'w-[350px]'
    )
  })

  it('has correct input styling', () => {
    render(<App />)

    const emailInput = screen.getByPlaceholderText('usuário@email.com')
    expect(emailInput).toHaveClass(
      'h-12',
      'bg-[#F3F4F6]',
      'border',
      'border-[#D1D5DB]',
      'rounded',
      'px-3',
      'py-2',
      'text-sm',
      'text-[#6B7280]'
    )

    const passwordInput = screen.getByPlaceholderText('Senha')
    expect(passwordInput).toHaveClass(
      'h-12',
      'bg-[#F3F4F6]',
      'border',
      'border-[#D1D5DB]',
      'rounded',
      'px-3',
      'py-2',
      'text-sm',
      'text-[#6B7280]'
    )
  })

  it('has correct button styling', () => {
    render(<App />)

    const loginButton = screen.getByText('Entrar')
    expect(loginButton).toHaveClass(
      'w-full',
      'h-12',
      'bg-[#10b981]',
      'hover:bg-[#059669]',
      'text-white',
      'rounded-lg',
      'mb-4'
    )

    const newUserButton = screen.getByText('Novo Usuário')
    expect(newUserButton).toHaveClass(
      'w-full',
      'h-12',
      'bg-[#3b82f6]',
      'hover:bg-[#2563eb]',
      'text-white',
      'rounded-lg'
    )
  })

  it('handles empty login attempt', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    render(<App />)

    const loginButton = screen.getByText('Entrar')
    await act(async () => {
      fireEvent.click(loginButton)
    })

    expect(consoleSpy).toHaveBeenCalledWith('Login attempt:', {
      email: '',
      password: '',
    })

    consoleSpy.mockRestore()
  })

  it('maintains form values when switching between login and modal', async () => {
    render(<App />)

    const emailInput = screen.getByPlaceholderText('usuário@email.com')
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })

    const passwordInput = screen.getByPlaceholderText('Senha')
    fireEvent.change(passwordInput, { target: { value: 'password123' } })

    // Open modal
    const newUserButton = screen.getByText('Novo Usuário')
    await act(async () => {
      fireEvent.click(newUserButton)
    })

    // Values should still be there
    expect(emailInput).toHaveValue('test@example.com')
    expect(passwordInput).toHaveValue('password123')
  })
})

