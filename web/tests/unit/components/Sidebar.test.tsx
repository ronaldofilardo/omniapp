// jest-dom matchers já importados globalmente via setupFiles
import '../../utils/mocks/setupFetchMock'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Sidebar from '@/components/Sidebar'

describe('Sidebar', () => {
  const mockOnMenuClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderComponent = (activeMenu = 'timeline', userId = 'user-1', userRole = 'RECEPTOR') => {
    return render(
      <Sidebar activeMenu={activeMenu} onMenuClick={mockOnMenuClick} userId={userId} userRole={userRole} />
    )
  }

  it('renders sidebar with title and subtitle', () => {
    renderComponent()

    expect(screen.getByText('OmniSaúde')).toBeInTheDocument()
    expect(screen.getByText('Tudo em suas mãos')).toBeInTheDocument()
  })

  it('renders all menu items', () => {
    renderComponent()

    expect(screen.getByText('Timeline')).toBeInTheDocument()
    expect(screen.getByText('Profissionais')).toBeInTheDocument()
    expect(screen.getByText('Repositório')).toBeInTheDocument()
    expect(screen.getByText('Calendário')).toBeInTheDocument()
    expect(screen.getByText('Sair')).toBeInTheDocument()
  })

  it('highlights active menu item', () => {
    renderComponent('professionals')

    const professionalsButton = screen.getByText('Profissionais')
    expect(professionalsButton.closest('button')).toHaveClass(
      'bg-[#10B981]',
      'text-white'
    )
  })

  it('calls onMenuClick when menu item is clicked', () => {
    renderComponent()

    const timelineButton = screen.getByText('Timeline')
    fireEvent.click(timelineButton)

    expect(mockOnMenuClick).toHaveBeenCalledWith('timeline')
  })

  it('calls onMenuClick with correct id for each menu item', () => {
    renderComponent()

    const professionalsButton = screen.getByText('Profissionais')
    fireEvent.click(professionalsButton)
    expect(mockOnMenuClick).toHaveBeenCalledWith('professionals')

    const repositorioButton = screen.getByText('Repositório')
    fireEvent.click(repositorioButton)
    expect(mockOnMenuClick).toHaveBeenCalledWith('repositorio')

    const calendarioButton = screen.getByText('Calendário')
    fireEvent.click(calendarioButton)
    expect(mockOnMenuClick).toHaveBeenCalledWith('calendario')
  })

  it('calls onMenuClick with logout when sair is clicked', () => {
    renderComponent()

    const sairButton = screen.getByText('Sair')
    fireEvent.click(sairButton)

    expect(mockOnMenuClick).toHaveBeenCalledWith('logout')
  })

  it('applies correct styling to inactive menu items', () => {
    renderComponent('timeline')

    const professionalsButton = screen
      .getByText('Profissionais')
      .closest('button')
    expect(professionalsButton).toHaveClass(
      'text-black',
      'hover:bg-gray-50'
    )
    expect(professionalsButton).not.toHaveClass('bg-[#10B981]')
  })

  it('applies correct styling to logout button', () => {
    renderComponent()

    const sairButton = screen.getByText('Sair').closest('button')
    expect(sairButton).toHaveClass('text-[#EF4444]', 'hover:bg-red-50')
  })

  it('renders icons for each menu item', () => {
    renderComponent()

    // Agora temos: 5 menu items + notificações + logout = 7 botões
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(7)

    // Cada botão deve conter um ícone (elemento svg)
    buttons.forEach((button) => {
      const svg = button.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })
  })

  it('has correct sidebar dimensions', () => {
  renderComponent()

  // A div mais externa do sidebar é o parentElement do header
  const headerDiv = screen.getByText('OmniSaúde').closest('div')
  const sidebar = headerDiv?.parentElement
  expect(sidebar).toHaveClass('w-[280px]', 'h-screen')
  })

  it('has correct layout structure', () => {
    renderComponent()

    const headerDiv = screen.getByText('OmniSaúde').closest('div')
    const sidebar = headerDiv?.parentElement
    expect(sidebar).toHaveClass(
      'bg-white',
      'border-r',
      'border-[#E5E7EB]',
      'flex',
      'flex-col'
    )
  })

  it('renders menu items in correct order', () => {
    renderComponent()

    const menuItems = screen.getAllByRole('button')
    expect(menuItems[0]).toHaveTextContent('Timeline')
    expect(menuItems[1]).toHaveTextContent('Profissionais')
    expect(menuItems[2]).toHaveTextContent('Repositório')
    expect(menuItems[3]).toHaveTextContent('Calendário')
    expect(menuItems[4]).toHaveTextContent('Dados Pessoais')
    expect(menuItems[5]).toHaveTextContent('Notificações')
    expect(menuItems[6]).toHaveTextContent('Sair')
  })

  it('handles different active menu states', () => {
    const { rerender } = renderComponent('timeline')

    expect(screen.getByText('Timeline').closest('button')).toHaveClass(
      'bg-[#10B981]'
    )

  rerender(<Sidebar activeMenu="repositorio" onMenuClick={mockOnMenuClick} userId="user-1" userRole="RECEPTOR" />)

    expect(screen.getByText('Timeline').closest('button')).not.toHaveClass(
      'bg-[#10B981]'
    )
    expect(screen.getByText('Repositório').closest('button')).toHaveClass(
      'bg-[#10B981]'
    )
  })

  describe('User Role Based Menu Rendering', () => {
    it('renders EMISSOR menu items when userRole is EMISSOR', () => {
      renderComponent('laudos', 'user-1', 'EMISSOR')

      expect(screen.getByText('Portal de Envio')).toBeInTheDocument()
      expect(screen.getByText('Relatórios')).toBeInTheDocument()
      expect(screen.getByText('Sair')).toBeInTheDocument()

      // Should not render RECEPTOR menu items
      expect(screen.queryByText('Timeline')).not.toBeInTheDocument()
      expect(screen.queryByText('Profissionais')).not.toBeInTheDocument()
      expect(screen.queryByText('Repositório')).not.toBeInTheDocument()
      expect(screen.queryByText('Calendário')).not.toBeInTheDocument()
      expect(screen.queryByText('Notificações')).not.toBeInTheDocument()
      expect(screen.queryByText('Dados Pessoais')).not.toBeInTheDocument()
    })

    it('renders RECEPTOR menu items when userRole is RECEPTOR', () => {
      renderComponent('timeline', 'user-1', 'RECEPTOR')

      expect(screen.getByText('Timeline')).toBeInTheDocument()
      expect(screen.getByText('Profissionais')).toBeInTheDocument()
      expect(screen.getByText('Repositório')).toBeInTheDocument()
      expect(screen.getByText('Calendário')).toBeInTheDocument()
      expect(screen.getByText('Notificações')).toBeInTheDocument()
      expect(screen.getByText('Dados Pessoais')).toBeInTheDocument()
      expect(screen.getByText('Sair')).toBeInTheDocument()

      // Should not render EMISSOR menu items
      expect(screen.queryByText('Portal de Envio')).not.toBeInTheDocument()
      expect(screen.queryByText('Relatórios')).not.toBeInTheDocument()
    })

    it('renders RECEPTOR menu items by default when userRole is empty', () => {
      renderComponent('timeline', 'user-1', '')

      expect(screen.getByText('Timeline')).toBeInTheDocument()
      expect(screen.getByText('Profissionais')).toBeInTheDocument()
      expect(screen.getByText('Repositório')).toBeInTheDocument()
      expect(screen.getByText('Calendário')).toBeInTheDocument()
      expect(screen.getByText('Notificações')).toBeInTheDocument()
      expect(screen.getByText('Dados Pessoais')).toBeInTheDocument()
      expect(screen.getByText('Sair')).toBeInTheDocument()

      // Should not render EMISSOR menu items
      expect(screen.queryByText('Portal de Envio')).not.toBeInTheDocument()
      expect(screen.queryByText('Relatórios')).not.toBeInTheDocument()
    })

    it('renders RECEPTOR menu items when userRole is invalid', () => {
      renderComponent('timeline', 'user-1', 'INVALID_ROLE')

      expect(screen.getByText('Timeline')).toBeInTheDocument()
      expect(screen.getByText('Profissionais')).toBeInTheDocument()
      expect(screen.getByText('Repositório')).toBeInTheDocument()
      expect(screen.getByText('Calendário')).toBeInTheDocument()
      expect(screen.getByText('Notificações')).toBeInTheDocument()
      expect(screen.getByText('Dados Pessoais')).toBeInTheDocument()
      expect(screen.getByText('Sair')).toBeInTheDocument()

      // Should not render EMISSOR menu items
      expect(screen.queryByText('Portal de envio')).not.toBeInTheDocument()
      expect(screen.queryByText('Relatório')).not.toBeInTheDocument()
    })


    it('calls onMenuClick com id correto para itens EMISSOR', () => {
      renderComponent('laudos', 'user-1', 'EMISSOR')

      const portalEnvioLink = screen.getByRole('link', { name: 'Portal de Envio' })
      fireEvent.click(portalEnvioLink)
      expect(mockOnMenuClick).toHaveBeenCalledWith('laudos')

      const relatorioLink = screen.getByRole('link', { name: 'Relatórios' })
      fireEvent.click(relatorioLink)
      expect(mockOnMenuClick).toHaveBeenCalledWith('relatorios')
    })

    it('destaca item ativo para EMISSOR', () => {
      renderComponent('relatorios', 'user-1', 'EMISSOR')

      const relatorioLink = screen.getByRole('link', { name: 'Relatórios' })
      expect(relatorioLink).toHaveClass('bg-[#10B981]', 'text-white')
    })

    it('renderiza quantidade correta de links e botões para EMISSOR', () => {
      renderComponent('laudos', 'user-1', 'EMISSOR')

      const links = screen.getAllByRole('link')
      expect(links).toHaveLength(2) // 2 menu items

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(1) // apenas o logout
    })

    it('renders correct number of buttons for RECEPTOR role', () => {
      renderComponent('timeline', 'user-1', 'RECEPTOR')

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(7) // 6 menu items + 1 logout
    })

    it('navega corretamente para rotas EMISSOR em mobile', () => {
      // Mock window.innerWidth para simular mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })

      renderComponent('laudos', 'user-1', 'EMISSOR')

      const portalEnvioLink = screen.getByRole('link', { name: 'Portal de Envio' })
      fireEvent.click(portalEnvioLink)

      expect(mockOnMenuClick).toHaveBeenCalledWith('laudos')
      // Verificar se o href está correto
      expect(portalEnvioLink).toHaveAttribute('href', '/laudos')
    })

    it('navega corretamente para rotas RECEPTOR em mobile', () => {
      // Mock window.innerWidth para simular mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })

      renderComponent('timeline', 'user-1', 'RECEPTOR')

      const timelineButton = screen.getByText('Timeline')
      fireEvent.click(timelineButton)

      expect(mockOnMenuClick).toHaveBeenCalledWith('timeline')
    })
  })
})

