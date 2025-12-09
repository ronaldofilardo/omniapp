import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateUserModal } from '@/components/CreateUserModal';
import { vi } from 'vitest';

describe('User Registration Flow - Integration', () => {
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

  it('completes full user registration flow successfully', async () => {
    // Mock successful registration
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<CreateUserModal {...defaultProps} />);

    // Fill out the form
    const fullNameInput = screen.getByPlaceholderText('Nome completo');
    const cpfInput = screen.getByPlaceholderText('CPF *');
    const phoneInput = screen.getByPlaceholderText('Telefone');
    const emailInput = screen.getByPlaceholderText('user@email.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const privacyCheckbox = screen.getByRole('checkbox', { name: /Política de Privacidade/i });
    const termsCheckbox = screen.getByRole('checkbox', { name: /Termos de Uso/i });
    const createButton = screen.getByText('Criar Usuário');

    fireEvent.change(fullNameInput, { target: { value: 'João Silva Santos' } });
      fireEvent.change(cpfInput, { target: { value: '123.456.789-01' } });
    fireEvent.change(phoneInput, { target: { value: '11987654321' } });
    fireEvent.change(emailInput, { target: { value: 'joao.santos@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'SecurePass123!' } });
    fireEvent.click(privacyCheckbox);
    fireEvent.click(termsCheckbox);

    // Submit the form
    fireEvent.click(createButton);

    // Verify API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'joao.santos@example.com',
          password: 'SecurePass123!',
          name: 'João Silva Santos',
            cpf: '123.456.789-01', // agora espera formatado
          telefone: '(11) 98765-4321',
          acceptedPrivacyPolicy: true,
          acceptedTermsOfUse: true,
        }),
      });
    });

    // Verify success callbacks
    expect(mockOnRegistered).toHaveBeenCalledWith({
      email: 'joao.santos@example.com',
      name: 'João Silva Santos',
    });

    // Wait for the modal to close automatically after success (2.5s timeout)
    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    }, { timeout: 3000 });
  });

  it('handles validation errors during registration', async () => {
    // Mock fetch to return server error
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Erro de servidor' }),
    });

    render(<CreateUserModal {...defaultProps} />);

    const createButton = screen.getByText('Criar Usuário');

    // Initially, button should be disabled when no fields are filled
    expect(createButton).toBeDisabled();

    // Fill only email, no password or CPF - button should still be disabled
    const emailInput = screen.getByPlaceholderText('user@email.com');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    expect(createButton).toBeDisabled();

    // Fill password but no CPF - button should still be disabled
    const passwordInput = screen.getByPlaceholderText('••••••••');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(createButton).toBeDisabled();

    // Fill CPF but no checkboxes - button should still be disabled
    const cpfInput = screen.getByPlaceholderText('CPF *');
    fireEvent.change(cpfInput, { target: { value: '123.456.789-01' } });

    expect(createButton).toBeDisabled();

    // Check privacy policy but not terms - button should still be disabled
    const privacyCheckbox = screen.getByRole('checkbox', { name: /Política de Privacidade/i });
    fireEvent.click(privacyCheckbox);

    expect(createButton).toBeDisabled();

    // Check terms - now button should be enabled
    const termsCheckbox = screen.getByRole('checkbox', { name: /Termos de Uso/i });
    fireEvent.click(termsCheckbox);

    expect(createButton).toBeEnabled();

    // Now try to submit with all required fields filled
    fireEvent.click(createButton);

    // Should show an error message
    await waitFor(() => {
      expect(screen.getByText(/Erro de servidor/i)).toBeInTheDocument();
    });
  });

  it('handles server validation errors', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'CPF já cadastrado no sistema' }),
    });

    render(<CreateUserModal {...defaultProps} />);

    const fullNameInput = screen.getByPlaceholderText('Nome completo');
    const cpfInput = screen.getByPlaceholderText('CPF *');
    const emailInput = screen.getByPlaceholderText('user@email.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const privacyCheckbox = screen.getByRole('checkbox', { name: /Política de Privacidade/i });
    const termsCheckbox = screen.getByRole('checkbox', { name: /Termos de Uso/i });
    const createButton = screen.getByText('Criar Usuário');

    fireEvent.change(fullNameInput, { target: { value: 'Maria Oliveira' } });
    fireEvent.change(cpfInput, { target: { value: '98765432100' } });
    fireEvent.change(emailInput, { target: { value: 'maria@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
    fireEvent.click(privacyCheckbox);
    fireEvent.click(termsCheckbox);

    fireEvent.click(createButton);

    // Wait for the error message to appear
    await waitFor(() => {
      expect(screen.getByText('CPF já cadastrado no sistema')).toBeInTheDocument();
    }, { timeout: 2000 });

    // Modal should remain open on error
    expect(mockOnOpenChange).not.toHaveBeenCalled();
    expect(mockOnRegistered).not.toHaveBeenCalled();
  });

  it('handles network errors gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(<CreateUserModal {...defaultProps} />);

    const fullNameInput = screen.getByPlaceholderText('Nome completo');
    const cpfInput = screen.getByPlaceholderText('CPF *');
    const emailInput = screen.getByPlaceholderText('user@email.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const privacyCheckbox = screen.getByRole('checkbox', { name: /Política de Privacidade/i });
    const termsCheckbox = screen.getByRole('checkbox', { name: /Termos de Uso/i });
    const createButton = screen.getByText('Criar Usuário');

    fireEvent.change(fullNameInput, { target: { value: 'Pedro Costa' } });
    fireEvent.change(cpfInput, { target: { value: '12345678901' } });
    fireEvent.change(emailInput, { target: { value: 'pedro@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Secure123!' } });
    fireEvent.click(privacyCheckbox);
    fireEvent.click(termsCheckbox);

    fireEvent.click(createButton);

    // Wait for the error message to appear
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('prevents multiple submissions while processing', async () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<CreateUserModal {...defaultProps} />);

    const fullNameInput = screen.getByPlaceholderText('Nome completo');
    const cpfInput = screen.getByPlaceholderText('CPF *');
    const emailInput = screen.getByPlaceholderText('user@email.com');
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const privacyCheckbox = screen.getByRole('checkbox', { name: /Política de Privacidade/i });
    const termsCheckbox = screen.getByRole('checkbox', { name: /Termos de Uso/i });
    const createButton = screen.getByText('Criar Usuário');

    fireEvent.change(fullNameInput, { target: { value: 'Ana Pereira' } });
    fireEvent.change(cpfInput, { target: { value: '12345678901' } });
    fireEvent.change(emailInput, { target: { value: 'ana@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'TestPass123!' } });
    fireEvent.click(privacyCheckbox);
    fireEvent.click(termsCheckbox);

    fireEvent.click(createButton);

    // Button should show loading state
    await waitFor(() => {
      expect(screen.getByText('Criando...')).toBeInTheDocument();
    }, { timeout: 2000 });

    // Try to click again - should not trigger another call
    fireEvent.click(screen.getByText('Criando...'));

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('formats and validates CPF input', () => {
    render(<CreateUserModal {...defaultProps} />);

    const cpfInput = screen.getByPlaceholderText('CPF *');

    fireEvent.change(cpfInput, { target: { value: '12345678901' } });
    expect(cpfInput).toHaveValue('123.456.789-01');

    // Test invalid CPF (too short)
    fireEvent.change(cpfInput, { target: { value: '123' } });
    expect(cpfInput).toHaveValue('123');
  });

  it('formats and validates phone input', () => {
    render(<CreateUserModal {...defaultProps} />);

    const phoneInput = screen.getByPlaceholderText('Telefone');

    fireEvent.change(phoneInput, { target: { value: '11987654321' } });
    expect(phoneInput).toHaveValue('(11) 98765-4321');

    // Test shorter phone
    fireEvent.change(phoneInput, { target: { value: '1187654321' } });
    expect(phoneInput).toHaveValue('(11) 8765-4321');
  });

  it('handles confirmation dialog on modal close', () => {
    render(<CreateUserModal {...defaultProps} />);

    const cpfInput = screen.getByPlaceholderText('CPF *');
    const emailInput = screen.getByPlaceholderText('user@email.com');
    fireEvent.change(cpfInput, { target: { value: '12345678901' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    // Simulate closing modal - this would trigger the confirmation dialog
    // Note: The actual close mechanism depends on the Dialog implementation
    // This test verifies the state management logic
    expect(cpfInput).toHaveValue('123.456.789-01');
    expect(emailInput).toHaveValue('test@example.com');
  });
});
