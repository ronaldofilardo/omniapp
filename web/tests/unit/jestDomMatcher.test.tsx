import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

// Teste mínimo para validar o matcher jest-dom

describe('jest-dom matcher', () => {
  it('deve reconhecer toBeInTheDocument', () => {
    render(<div>Olá mundo</div>);
    expect(screen.getByText('Olá mundo')).toBeInTheDocument();
  });
});
