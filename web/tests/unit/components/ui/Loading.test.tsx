import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  Spinner,
  PageLoading,
  CardLoading,
  ListSkeleton,
  TableSkeleton,
  DashboardCardSkeleton,
  FormLoading,
  InlineLoading,
  LoadingOverlay,
  ProgressLoading,
  PulsingText,
} from '@/components/ui/Loading';

describe('Spinner', () => {
  it('deve renderizar spinner com tamanho padrão', () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('h-8', 'w-8');
  });

  it('deve renderizar spinner com tamanho customizado', () => {
    const { container } = render(<Spinner size="lg" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-12', 'w-12');
  });

  it('deve renderizar spinner com cor customizada', () => {
    const { container } = render(<Spinner color="gray" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('text-gray-600');
  });

  it('deve ter animação de rotação', () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('animate-spin');
  });
});

describe('PageLoading', () => {
  it('deve renderizar loading de página com spinner', () => {
    const { container } = render(<PageLoading />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('deve exibir mensagem quando fornecida', () => {
    render(<PageLoading message="Carregando dados..." />);
    expect(screen.getByText('Carregando dados...')).toBeInTheDocument();
  });

  it('não deve exibir mensagem quando não fornecida', () => {
    const { container } = render(<PageLoading />);
    expect(container.querySelector('p')).not.toBeInTheDocument();
  });
});

describe('CardLoading', () => {
  it('deve renderizar loading de card com spinner', () => {
    const { container } = render(<CardLoading />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('deve exibir mensagem quando fornecida', () => {
    render(<CardLoading message="Carregando card..." />);
    expect(screen.getByText('Carregando card...')).toBeInTheDocument();
  });
});

describe('ListSkeleton', () => {
  it('deve renderizar número padrão de itens', () => {
    const { container } = render(<ListSkeleton />);
    const items = container.querySelectorAll('.animate-pulse');
    expect(items).toHaveLength(3);
  });

  it('deve renderizar número customizado de itens', () => {
    const { container } = render(<ListSkeleton items={5} />);
    const items = container.querySelectorAll('.animate-pulse');
    expect(items).toHaveLength(5);
  });

  it('deve ter animação de pulse', () => {
    const { container } = render(<ListSkeleton />);
    const items = container.querySelectorAll('.animate-pulse');
    expect(items.length).toBeGreaterThan(0);
  });
});

describe('TableSkeleton', () => {
  it('deve renderizar número padrão de linhas e colunas', () => {
    const { container } = render(<TableSkeleton />);
    const rows = container.querySelectorAll('.grid');
    // 1 header + 5 rows = 6
    expect(rows).toHaveLength(6);
  });

  it('deve renderizar número customizado de linhas', () => {
    const { container } = render(<TableSkeleton rows={3} />);
    const rows = container.querySelectorAll('.grid');
    // 1 header + 3 rows = 4
    expect(rows).toHaveLength(4);
  });

  it('deve aplicar grid template corretamente', () => {
    const { container } = render(<TableSkeleton cols={3} />);
    const grid = container.querySelector('.grid');
    expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(3, 1fr)' });
  });
});

describe('DashboardCardSkeleton', () => {
  it('deve renderizar skeleton de card de dashboard', () => {
    const { container } = render(<DashboardCardSkeleton />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('deve ter elementos de loading', () => {
    const { container } = render(<DashboardCardSkeleton />);
    const elements = container.querySelectorAll('.bg-gray-200, .bg-gray-300');
    expect(elements.length).toBeGreaterThan(0);
  });
});

describe('FormLoading', () => {
  it('deve renderizar skeleton de formulário', () => {
    const { container } = render(<FormLoading />);
    const fields = container.querySelectorAll('.bg-gray-200, .bg-gray-300');
    expect(fields.length).toBeGreaterThan(0);
  });

  it('deve ter animação de pulse', () => {
    const { container } = render(<FormLoading />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});

describe('InlineLoading', () => {
  it('deve renderizar spinner inline', () => {
    const { container } = render(<InlineLoading />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('deve exibir mensagem quando fornecida', () => {
    render(<InlineLoading message="Carregando..." />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('deve ter display inline-flex', () => {
    const { container } = render(<InlineLoading />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('inline-flex');
  });
});

describe('LoadingOverlay', () => {
  it('deve renderizar quando show é true', () => {
    const { container } = render(<LoadingOverlay show={true} />);
    // Verifica se o overlay contém o spinner (SVG)
    const spinner = container.querySelector('svg');
    expect(spinner).toBeInTheDocument();
  });

  it('não deve renderizar quando show é false', () => {
    const { container } = render(<LoadingOverlay show={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('deve exibir mensagem quando fornecida', () => {
    render(<LoadingOverlay show={true} message="Processando..." />);
    expect(screen.getByText('Processando...')).toBeInTheDocument();
  });

  it('deve ter overlay com backdrop', () => {
    const { container } = render(<LoadingOverlay show={true} />);
    const overlay = container.querySelector('.fixed.inset-0');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveClass('bg-black', 'bg-opacity-50');
  });
});

describe('ProgressLoading', () => {
  it('deve renderizar barra de progresso', () => {
    const { container } = render(<ProgressLoading progress={50} />);
    const progressBar = container.querySelector('[style*="width: 50%"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('deve exibir porcentagem corretamente', () => {
    render(<ProgressLoading progress={75} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('deve exibir mensagem quando fornecida', () => {
    render(<ProgressLoading progress={30} message="Enviando arquivos..." />);
    expect(screen.getByText('Enviando arquivos...')).toBeInTheDocument();
  });

  it('deve usar mensagem padrão quando não fornecida', () => {
    render(<ProgressLoading progress={40} />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('deve arredondar porcentagem', () => {
    render(<ProgressLoading progress={33.7} />);
    expect(screen.getByText('34%')).toBeInTheDocument();
  });
});

describe('PulsingText', () => {
  it('deve renderizar texto padrão', () => {
    render(<PulsingText />);
    expect(screen.getByText('Carregando')).toBeInTheDocument();
  });

  it('deve renderizar texto customizado', () => {
    render(<PulsingText text="Processando" />);
    expect(screen.getByText('Processando')).toBeInTheDocument();
  });

  it('deve ter animação de pulse e bounce', () => {
    const { container } = render(<PulsingText />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-bounce')).toHaveLength(3);
  });

  it('deve renderizar três pontos animados', () => {
    const { container } = render(<PulsingText />);
    const dots = container.querySelectorAll('.animate-bounce');
    expect(dots).toHaveLength(3);
  });
});

