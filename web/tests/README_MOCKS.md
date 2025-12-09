# Sistema de Mocks Globais

Este documento descreve o sistema de mocks globais implementado para garantir consistência e robustez nos testes.

## Arquitetura

### 1. Mocks Globais (`tests/__mocks__/global.ts`)

Este arquivo é carregado **PRIMEIRO** antes de qualquer importação, garantindo que todos os mocks sejam estabelecidos antes que qualquer módulo seja importado.

**Mocks incluídos:**

- **Prisma Client**: Mock completo de todas as operações de banco de dados
- **Next.js Router**: Mock do `useRouter`, `usePathname`, etc.
- **NextAuth**: Mock de autenticação
- **APIs do Browser**: `fetch`, `alert`, `confirm`, `ResizeObserver`, etc.
- **Console**: Filtragem inteligente de logs em testes

### 2. Utilitários de Teste (`tests/utils/test-utils.ts`)

Fornece funções de configuração específicas para diferentes tipos de teste:

```typescript
import {
  setupApiMocks,
  setupOrphanFilesMocks,
  mockPrisma,
} from "../../utils/test-utils";

describe("Meu Teste", () => {
  beforeEach(() => {
    setupApiMocks(); // ou setupOrphanFilesMocks(), etc.
  });
});
```

### 3. Configuração do Vitest

O arquivo `vitest.config.ts` está configurado para carregar os mocks na ordem correta:

```typescript
setupFiles: [
  "./tests/__mocks__/global.ts", // PRIMEIRO - Mocks globais
  "./tests/setupJestDom.ts", // Jest-DOM matchers
  "./tests/setup.ts", // Setup adicional
];
```

## Como Usar

### Para Testes de API

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { setupApiMocks, mockPrisma } from '../../utils/test-utils'

describe('API Test', () => {
  beforeEach(() => {
    setupApiMocks()

    // Configurações específicas se necessário
    mockPrisma.user.findMany.mockResolvedValue([...])
  })

  it('should work', async () => {
    // Seu teste aqui
  })
})
```

### Para Testes de Componentes

```typescript
import { render, screen } from "@testing-library/react";
import { setupComponentMocks } from "../../utils/test-utils";

describe("Component Test", () => {
  beforeEach(() => {
    setupComponentMocks();
  });

  it("should render", () => {
    render(<MyComponent />);
    // Testes do componente
  });
});
```

### Para Testes Específicos (Arquivos Órfãos)

```typescript
import { setupOrphanFilesMocks } from "../../utils/test-utils";

describe("Orphan Files", () => {
  beforeEach(() => {
    setupOrphanFilesMocks(); // Já configura mocks específicos
  });
});
```

## Funções Disponíveis

### `setupApiMocks()`

Configuração padrão para testes de API com mocks básicos de usuário e fetch.

### `setupComponentMocks()`

Configuração para testes de componentes React.

### `setupOrphanFilesMocks()`

Configuração específica para testes de arquivos órfãos com dados pré-definidos.

### `setupHealthEventMocks()`

Configuração para testes de eventos de saúde.

### `setupNotificationMocks()`

Configuração para testes de notificações.

### `resetAllMocks()`

Reset completo de todos os mocks (chamado automaticamente após cada teste).

### `createMockResponse(data, status)`

Utilitário para criar respostas HTTP mockadas.

### `createMockRequest(url, options)`

Utilitário para criar requests do Next.js mockados.

## Vantagens do Sistema

1. **Aplicação Antes de Importações**: Os mocks são estabelecidos antes de qualquer importação, evitando problemas de timing.

2. **Consistência**: Todos os testes usam os mesmos mocks base, garantindo comportamento consistente.

3. **Flexibilidade**: Funções de setup específicas permitem configurações customizadas sem afetar outros testes.

4. **Limpeza Automática**: Todos os mocks são resetados automaticamente após cada teste.

5. **Reutilização**: Configurações comuns podem ser reutilizadas através das funções de setup.

6. **Debugging Melhorado**: Sistema de logs filtrados reduz ruído nos testes.

## Migração de Testes Existentes

Para migrar testes existentes:

1. **Remover mocks individuais**:

   ```typescript
   // ❌ Remover
   vi.mock("../../src/lib/prisma", () => ({ prisma: mockPrisma }));
   ```

2. **Usar setup functions**:

   ```typescript
   // ✅ Adicionar
   import { setupApiMocks } from "../../utils/test-utils";

   beforeEach(() => {
     setupApiMocks();
   });
   ```

3. **Atualizar importações**:
   ```typescript
   // ✅ Usar
   import { mockPrisma } from "../../utils/test-utils";
   ```

## Troubleshooting

### Mock não funciona

- Verificar se está importando de `test-utils.ts`
- Confirmar que o setup correto está sendo chamado no `beforeEach`

### Dados de teste incorretos

- Usar a função de setup adequada para seu tipo de teste
- Sobrescrever mocks específicos após o setup se necessário

### Problemas de timing

- O sistema garante que mocks são aplicados primeiro
- Se ainda houver problemas, verificar a ordem das importações no teste
