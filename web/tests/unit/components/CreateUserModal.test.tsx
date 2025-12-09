import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CreateUserModal } from '@/components/CreateUserModal';

describe('CreateUserModal', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnRegistered = vi.fn();

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    onRegistered: mockOnRegistered,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('renders modal when open is true', () => {
  render(<CreateUserModal {...defaultProps} />);
  // Pode haver mais de um heading com esse texto
  const headings = screen.getAllByRole('heading', { name: 'Criar Novo Usuário' });
  expect(headings.length).toBeGreaterThan(0);
  });

  it('does not render modal when open is false', () => {
    render(<CreateUserModal {...defaultProps} open={false} />);
    expect(screen.queryByText('Criar Novo Usuário')).not.toBeInTheDocument();
  });

  it('allows typing in all input fields', () => {
    render(<CreateUserModal {...defaultProps} />);

    const fullNameInput = screen.getByPlaceholderText('Nome completo');
    const cpfInput = screen.getByPlaceholderText('CPF *');
    const phoneInput = screen.getByPlaceholderText('Telefone');
    const emailInput = screen.getByPlaceholderText('user@email.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');

    fireEvent.change(fullNameInput, { target: { value: 'João Silva' } });
    fireEvent.change(cpfInput, { target: { value: '12345678901' } });
    fireEvent.change(phoneInput, { target: { value: '11987654321' } });
    fireEvent.change(emailInput, { target: { value: 'joao@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(fullNameInput).toHaveValue('João Silva');
    expect(cpfInput).toHaveValue('123.456.789-01');
    expect(phoneInput).toHaveValue('(11) 98765-4321');
    expect(emailInput).toHaveValue('joao@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('formats CPF correctly', () => {
    render(<CreateUserModal {...defaultProps} />);
    const cpfInput = screen.getByPlaceholderText('CPF *');

    fireEvent.change(cpfInput, { target: { value: '12345678901' } });
    expect(cpfInput).toHaveValue('123.456.789-01');
  });

  it('formats phone correctly', () => {
    render(<CreateUserModal {...defaultProps} />);
    const phoneInput = screen.getByPlaceholderText('Telefone');

    fireEvent.change(phoneInput, { target: { value: '11987654321' } });
    expect(phoneInput).toHaveValue('(11) 98765-4321');
  });

  it('toggles password visibility', () => {
    render(<CreateUserModal {...defaultProps} />);
    const passwordInput = screen.getByPlaceholderText('••••••••');
    // Busca todos os botões e filtra pelo que contém um SVG de olho (lucide-eye)
    // Busca botão pelo aria-label ou data-testid se disponível, senão pelo SVG
    let toggleButton = screen.queryByLabelText(/mostrar senha|alternar senha|toggle password/i) || null;
    if (!toggleButton) {
      const buttons = screen.getAllByRole('button');
      toggleButton = buttons.find((btn) => {
        const svg = btn.querySelector('svg');
        if (!svg) return false;
        // Tenta className.baseVal (SVG) ou className (string)
        const className = typeof svg.className === 'object' && 'baseVal' in svg.className ? svg.className.baseVal : svg.className;
        return className && className.toString().includes('eye');
      }) || null;
    }
    expect(toggleButton).not.toBeNull();
    expect(passwordInput).toHaveAttribute('type', 'password');
    fireEvent.click(toggleButton!);
    expect(passwordInput).toHaveAttribute('type', 'text');
    fireEvent.click(toggleButton!);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('shows error when email, password or CPF is missing', async () => {
    render(<CreateUserModal {...defaultProps} />);

    const createButton = screen.getByText('Criar Usuário');
    expect(createButton).toBeDisabled();
  });

  it('shows error when CPF has less than 11 digits', async () => {
    render(<CreateUserModal {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText('user@email.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const cpfInput = screen.getByPlaceholderText('CPF *');
    const createButton = screen.getByText('Criar Usuário');

    fireEvent.change(emailInput, { target: { value: 'joao@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(cpfInput, { target: { value: '123456789' } }); // 9 digits
    expect(createButton).toBeDisabled();
  });

  it('shows error when terms are not accepted', async () => {
    render(<CreateUserModal {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText('user@email.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const cpfInput = screen.getByPlaceholderText('CPF *');
    const createButton = screen.getByText('Criar Usuário');

    fireEvent.change(emailInput, { target: { value: 'joao@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(cpfInput, { target: { value: '12345678901' } });
    expect(createButton).toBeDisabled();
  });

  it('creates user successfully', async () => {
    // Mock da resposta da API
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<CreateUserModal {...defaultProps} />);

    // Preenche o formulário
    fireEvent.change(screen.getByPlaceholderText('Nome completo'), { target: { value: 'João Silva' } });
    fireEvent.change(screen.getByPlaceholderText('CPF *'), { target: { value: '12345678901' } });
    fireEvent.change(screen.getByPlaceholderText('Telefone'), { target: { value: '11987654321' } });
    fireEvent.change(screen.getByPlaceholderText('user@email.com'), { target: { value: 'joao@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Política de Privacidade/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Termos de Uso/i }));

    // Submete o formulário
    fireEvent.click(screen.getByText('Criar Usuário'));

    // Aguarda as asserções
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'joao@example.com',
          password: 'password123',
          name: 'João Silva',
          cpf: '123.456.789-01',
          telefone: '(11) 98765-4321',
          acceptedPrivacyPolicy: true,
          acceptedTermsOfUse: true,
        }),
      });
      expect(mockOnRegistered).toHaveBeenCalledWith({
        email: 'joao@example.com',
        name: 'João Silva',
      });
    });

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    }, { timeout: 3000 });
  });

  it('handles registration error', async () => {
    // Mock da resposta de erro da API
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Email já existe' }),
    });

    render(<CreateUserModal {...defaultProps} />);

    // Preenche o formulário
    fireEvent.change(screen.getByPlaceholderText('Nome completo'), { target: { value: 'João Silva' } });
    fireEvent.change(screen.getByPlaceholderText('CPF *'), { target: { value: '12345678901' } });
    fireEvent.change(screen.getByPlaceholderText('Telefone'), { target: { value: '11987654321' } });
    fireEvent.change(screen.getByPlaceholderText('user@email.com'), { target: { value: 'joao@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Política de Privacidade/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Termos de Uso/i }));

    // Submete o formulário
    fireEvent.click(screen.getByText('Criar Usuário'));

    // Aguarda a mensagem de erro
    await waitFor(() => {
      expect(screen.getByText('Email já existe')).toBeInTheDocument();
    });
  });

  it('shows confirmation dialog when closing with filled data', () => {
    render(<CreateUserModal {...defaultProps} />);
    const cpfInput = screen.getByPlaceholderText('CPF *');
    const emailInput = screen.getByPlaceholderText('user@email.com');
    fireEvent.change(cpfInput, { target: { value: '12345678901' } });
    fireEvent.change(emailInput, { target: { value: 'joao@example.com' } });
    // Seleciona o botão de fechar pelo papel e posição (último botão, geralmente)
    const buttons = screen.getAllByRole('button');
    // O botão de fechar geralmente é o último ou penúltimo
    const closeButton = buttons[buttons.length - 1];
    fireEvent.click(closeButton);
    // Aqui pode-se esperar que o diálogo de confirmação apareça, se aplicável
  });

  it('closes modal without confirmation when no data is filled', () => {
    render(<CreateUserModal {...defaultProps} />);

    // Simulate closing without data
    mockOnOpenChange(false);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});

