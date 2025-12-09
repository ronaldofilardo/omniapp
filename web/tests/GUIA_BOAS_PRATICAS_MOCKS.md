# Guia de Boas Práticas para Mocks e Testes

Este guia estabelece padrões e práticas recomendadas para testes no projeto, seguindo a **regra de ouro: quanto menos mocks, melhor**.

## 📋 Índice

1. [Regra de Ouro](#regra-de-ouro)
2. [Arquitetura de Testes](#arquitetura-de-testes)
3. [Quando Mockar](#quando-mockar)
4. [Ferramentas Disponíveis](#ferramentas-disponíveis)
5. [Padrões de Uso](#padrões-de-uso)
6. [Exemplos Práticos](#exemplos-práticos)
7. [Anti-Padrões](#anti-padrões)

---

## 🎯 Regra de Ouro

**Quanto mais você mocka, mais frágil fica o teste.**

### Ordem de Preferência

1. **Testes de Integração com Banco Real** ✅ MELHOR

   - Usar banco de teste PostgreSQL local
   - Scripts de reset disponíveis: `pnpm test:unit`, `pnpm test:integration`
   - Maior confiança, testa o sistema completo

2. **Testes com Repositórios Reais + Mocks Externos** ✅ BOM

   - Usar camada de repositórios (`src/repositories/`)
   - Mockar apenas APIs externas (Cloudinary, email, etc)
   - Mantém lógica de negócio testada de verdade

3. **Mocks Parciais (Partial Mocking)** ⚠️ USE COM CUIDADO

   - Mockar apenas métodos específicos do Prisma
   - Exemplo: `vi.spyOn(prisma.user, 'findUnique')`
   - Útil para casos edge muito específicos

4. **Mocks Completos** ❌ EVITAR
   - Só quando absolutamente necessário
   - Exemplo: testes unitários puros de lógica isolada
   - Sempre questione se realmente precisa

---

## 🏗️ Arquitetura de Testes

### Estrutura de Diretórios

```
web/tests/
├── setup/                      # Configurações globais
│   ├── setup.ts                # Setup principal
│   ├── mock-helpers.ts         # Helpers para mocks
│   ├── msw-setup.ts            # Mock Service Worker
│   ├── test-factories.ts       # Factories de dados
│   └── prisma-mock.ts          # Re-export de mocks
├── __mocks__/                  # Mocks globais
│   └── global.ts               # Mock global do Prisma
├── unit/                       # Testes unitários
├── integration/                # Testes de integração
└── e2e/                        # Testes E2E (Playwright)
```

### Camada de Repositórios

```
web/src/repositories/
├── base.repository.ts          # Interface base
├── healthEvent.repository.ts   # Repositório de eventos
├── professional.repository.ts  # Repositório de profissionais
├── user.repository.ts          # Repositório de usuários
└── notification.repository.ts  # Repositório de notificações
```

**Benefício**: Mockar a interface do repositório é muito mais estável que mockar o Prisma direto.

---

## 🎭 Quando Mockar

### ✅ SEMPRE Mockar

- **APIs de terceiros**: Cloudinary, SendGrid, Twilio, etc.
- **Serviços externos instáveis**: APIs de laboratórios, webhooks
- **Operações caras**: Envio de emails, SMS, processamento de imagens
- **Integrações pagas**: Serviços que cobram por requisição

### ⚠️ MOCKAR COM CUIDADO

- **Autenticação**: NextAuth já tem mocks globais
- **Navigation**: Next.js Router já tem mocks globais
- **Métodos específicos do Prisma**: Apenas quando necessário

### ❌ NUNCA Mockar

- **Validação de formulários**: Use dados reais
- **Formatação de dados**: Teste a função real
- **Lógica de negócio simples**: Teste sem mocks
- **Repositórios em testes de integração**: Use banco real

---

## 🛠️ Ferramentas Disponíveis

### 1. vitest-mock-extended

Mock profundo e tipado automaticamente.

```typescript
import { mockDeep, mockReset } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

const mockPrisma = mockDeep<PrismaClient>();
```

**Benefícios:**

- ✅ Tipagem automática completa
- ✅ Mocks aninhados (nested)
- ✅ Menos código manual
- ✅ Mais estável

### 2. MSW (Mock Service Worker)

Mock de APIs HTTP de forma realista.

```typescript
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

const server = setupServer(
  http.post("/api/upload", () => {
    return HttpResponse.json({ url: "https://cloudinary.com/test.jpg" });
  })
);
```

**Benefícios:**

- ✅ Funciona em unit e E2E
- ✅ Simula rede real
- ✅ Testável em diferentes cenários (erro, timeout, etc)

### 3. Test Factories

Criar dados de teste consistentes e realistas.

```typescript
import { testDataFactory } from "@/tests/setup/test-factories";

const user = testDataFactory.user.build();
const admin = testDataFactory.user.admin();
const events = testDataFactory.healthEvent.buildMany(5);
```

**Benefícios:**

- ✅ Dados consistentes
- ✅ Fácil criar variações
- ✅ Reduz duplicação
- ✅ Tipo-safe

### 4. Repositórios

Abstrair acesso ao banco de dados.

```typescript
import { healthEventRepository } from '@/repositories'

// Em testes de integração: usa Prisma real
const events = await healthEventRepository.findByUserId('user-123')

// Em testes unitários: mock apenas a interface
const mockRepo = {
  findByUserId: vi.fn().mockResolvedValue([...])
}
```

---

## 📖 Padrões de Uso

### Padrão 1: Teste de Integração (PREFERIDO)

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma"; // Prisma REAL
import { testDataFactory } from "@/tests/setup/test-factories";

describe("HealthEvent - Integration", () => {
  beforeEach(async () => {
    // Limpar banco antes de cada teste
    await prisma.healthEvent.deleteMany();
  });

  it("deve criar evento no banco real", async () => {
    const user = await prisma.user.create({
      data: testDataFactory.user.build(),
    });

    const event = await prisma.healthEvent.create({
      data: {
        ...testDataFactory.healthEvent.build(),
        userId: user.id,
      },
    });

    expect(event.id).toBeDefined();
    expect(event.userId).toBe(user.id);
  });
});
```

### Padrão 2: Mock Parcial com Spy

```typescript
import { describe, it, expect, vi } from "vitest";
import { mockPrisma } from "@/tests/__mocks__/global";
import { testDataFactory } from "@/tests/setup/test-factories";

describe("HealthEvent - Partial Mock", () => {
  it("deve mockar apenas findUnique", async () => {
    const mockEvent = testDataFactory.healthEvent.build();

    // ✅ Mock apenas este método
    vi.spyOn(mockPrisma.healthEvent, "findUnique").mockResolvedValue(mockEvent);

    const result = await mockPrisma.healthEvent.findUnique({
      where: { id: "test-id" },
    });

    expect(result).toEqual(mockEvent);
  });
});
```

### Padrão 3: Mock de API Externa com MSW

```typescript
import { describe, it, expect } from "vitest";
import { addMSWHandler } from "@/tests/setup/msw-setup";
import { http, HttpResponse } from "msw";

describe("Cloudinary Upload", () => {
  it("deve fazer upload com sucesso", async () => {
    // ✅ Mock apenas API externa
    addMSWHandler(
      http.post("*/cloudinary/*/upload", () => {
        return HttpResponse.json({
          secure_url: "https://cloudinary.com/test.jpg",
          public_id: "test-123",
        });
      })
    );

    const formData = new FormData();
    formData.append("file", new Blob(["test"]));

    const response = await fetch(
      "https://api.cloudinary.com/v1_1/test/image/upload",
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();
    expect(data.secure_url).toBeDefined();
  });

  it("deve tratar erro de upload", async () => {
    // ✅ Testar cenário de erro
    addMSWHandler(
      http.post("*/cloudinary/*/upload", () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const response = await fetch(
      "https://api.cloudinary.com/v1_1/test/image/upload",
      {
        method: "POST",
        body: new FormData(),
      }
    );

    expect(response.status).toBe(500);
  });
});
```

### Padrão 4: Teste com Repositório

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { mockPrisma } from "@/tests/__mocks__/global";
import { healthEventRepository } from "@/repositories";
import { testDataFactory } from "@/tests/setup/test-factories";

describe("HealthEventRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve retornar eventos do usuário", async () => {
    const mockEvents = testDataFactory.healthEvent.buildMany(3);

    mockPrisma.healthEvent.findMany.mockResolvedValue(mockEvents);

    const result = await healthEventRepository.findByUserId("user-123");

    expect(result).toHaveLength(3);
    expect(mockPrisma.healthEvent.findMany).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      orderBy: { date: "desc" },
    });
  });
});
```

---

## 🚫 Anti-Padrões

### ❌ Mockar demais

```typescript
// ERRADO: Mockando tudo desnecessariamente
vi.mock("@/lib/prisma");
vi.mock("@/repositories");
vi.mock("@/services");
vi.mock("@/utils");
vi.mock("@/validators");
// ... agora você não está testando nada real!
```

### ❌ Mocks inline repetidos

```typescript
// ERRADO: Criando dados manualmente em cada teste
it('teste 1', () => {
  const user = { id: '1', name: 'Test', email: 'test@test.com', ... }
})

it('teste 2', () => {
  const user = { id: '2', name: 'Test2', email: 'test2@test.com', ... }
})

// CORRETO: Usar factory
it('teste 1', () => {
  const user = testDataFactory.user.build()
})

it('teste 2', () => {
  const user = testDataFactory.user.build({ name: 'Custom Name' })
})
```

### ❌ Mock sem tipagem

```typescript
// ERRADO: Mock sem tipos
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
  },
} as any; // ❌ perdeu a tipagem!

// CORRETO: Mock tipado
const mockPrisma = mockDeep<PrismaClient>(); // ✅ tipagem completa
```

### ❌ Não resetar mocks

```typescript
// ERRADO: Mocks persistem entre testes
describe("Tests", () => {
  it("teste 1", () => {
    mockPrisma.user.findUnique.mockResolvedValue(user1);
  });

  it("teste 2", () => {
    // ❌ mock do teste 1 ainda está ativo!
  });
});

// CORRETO: Reset automático
beforeEach(() => {
  vi.clearAllMocks();
  // ou
  mockReset(mockPrisma);
});
```

---

## 📚 Recursos Adicionais

### Arquivos de Setup Disponíveis

- `tests/setup/mock-helpers.ts` - Helpers para mocks
- `tests/setup/msw-setup.ts` - Configuração MSW
- `tests/setup/test-factories.ts` - Factories de dados
- `tests/__mocks__/global.ts` - Mocks globais

### Comandos de Teste

```bash
# Testes unitários (com banco de teste)
pnpm test:unit

# Testes de integração (com banco de teste)
pnpm test:integration

# Todos os testes
pnpm test:all

# Testes com watch mode
pnpm test:watch

# Testes E2E
pnpm test:e2e

# Coverage
pnpm test:coverage
```

### Documentação Relacionada

- `tests/README.md` - Guia geral de testes
- `tests/README_MOCKS.md` - Documentação de mocks específicos
- `docs/ERROR_BOUNDARIES_GUIDE.md` - Tratamento de erros
- `docs/PERFORMANCE_MONITORING.md` - Testes de performance

---

## 🎓 Checklist para Novos Testes

Antes de escrever um teste, pergunte:

- [ ] Este teste pode ser de integração com banco real?
- [ ] Posso usar factories ao invés de criar dados manualmente?
- [ ] Estou mockando apenas o estritamente necessário?
- [ ] Os mocks são estáveis e não dependem de implementação?
- [ ] Estou usando MSW para APIs externas?
- [ ] O teste vai quebrar se eu refatorar código interno?
- [ ] Os mocks estão sendo resetados entre testes?

**Se você respondeu "não" para qualquer item, revise sua abordagem!**

---

## 💡 Dicas Finais

1. **Prefira testes de integração**: São mais lentos, mas muito mais confiáveis
2. **Use factories**: Reduz duplicação e aumenta consistência
3. **Mock apenas o externo**: APIs de terceiros, não sua própria lógica
4. **Repositórios são seus amigos**: Abstrair o Prisma facilita muito os testes
5. **MSW é poderoso**: Use para todas as APIs HTTP externas
6. **Reset é crucial**: Sempre limpar estado entre testes
7. **Tipagem importa**: Use vitest-mock-extended para mocks tipados

---

**Lembre-se**: Um teste com menos mocks é um teste mais confiável! 🎯
