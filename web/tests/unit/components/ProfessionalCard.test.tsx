import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProfessionalCard } from '@/components/ProfessionalCard';

describe('ProfessionalCard', () => {
  it('renderiza nome e especialidade', () => {
    render(
      <ProfessionalCard
        id="1"
        name="Dr. Teste"
        specialty="Cardiologia"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText('Dr. Teste')).toBeInTheDocument();
    expect(screen.getByText('Cardiologia')).toBeInTheDocument();
  });
});

