import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { GoToLoginButton } from '@/components/GoToLoginButton'

// Mock do useRouter
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

describe('GoToLoginButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the button with correct text', () => {
    render(<GoToLoginButton />)

    const button = screen.getByRole('button', { name: /ir para o login/i })
    expect(button).toBeInTheDocument()
  })

  it('navigates to /login when clicked', () => {
    render(<GoToLoginButton />)

    const button = screen.getByRole('button', { name: /ir para o login/i })
    fireEvent.click(button)

    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  it('has correct styling classes', () => {
    render(<GoToLoginButton />)

    const button = screen.getByRole('button', { name: /ir para o login/i })
    expect(button).toHaveClass(
      'bg-green-600',
      'hover:bg-green-700',
      'text-white',
      'font-medium',
      'px-8',
      'py-6',
      'text-lg'
    )
  })
})

