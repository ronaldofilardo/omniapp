# Guia de Migração - Refatorando Testes Existentes

Este guia mostra como migrar testes antigos para os novos padrões.

## 📋 Mudanças Principais

### 1. Mock do Prisma: Manual → vitest-mock-extended

**ANTES (Antigo):**

```typescript
// ❌ Mock manual verboso e frágil
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    // ... dezenas de métodos
  },
  healthEvent: {
    // ... mais dezenas de métodos
  },
  // ... para cada tabela
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));
```

**DEPOIS (Novo):**

```typescript
// ✅ Mock automático, tipado e profundo
import { mockPrisma } from "@/tests/__mocks__/global";
// Pronto! mockPrisma já está disponível e tipado
```

### 2. Dados de Teste: Manual → Factory

**ANTES:**

```typescript
// ❌ Dados duplicados em cada teste
const testUser = {
  id: "user-123",
  name: "Test User",
  email: "test@example.com",
  emailVerified: null,
  image: null,
  role: "PACIENTE",
  createdAt: new Date(),
  updatedAt: new Date(),
  password: null,
};

const testEvent = {
  id: "event-123",
  title: "Consulta",
  description: "Consulta médica",
  date: "2025-12-06",
  startTime: "09:00",
  endTime: "10:00",
  type: "CONSULTA",
  userId: "user-123",
  professionalId: "prof-123",
  files: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

**DEPOIS:**

```typescript
// ✅ Factory reutilizável e consistente
import { testDataFactory } from "@/tests/setup/test-factories";

const testUser = testDataFactory.user.build();
const testEvent = testDataFactory.healthEvent.consulta();

// Com overrides específicos
const adminUser = testDataFactory.user.admin({ name: "Admin Custom" });
const exame = testDataFactory.healthEvent.exame({ date: "2025-12-10" });
```

### 3. Mock de API Externa: Fetch mock → MSW

**ANTES:**

```typescript
// ❌ Mock frágil e não realista
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ url: "https://cloudinary.com/test.jpg" }),
});
```

**DEPOIS:**

```typescript
// ✅ Mock realista e testável em diferentes cenários
import { addMSWHandler } from "@/tests/setup/msw-setup";
import { http, HttpResponse } from "msw";

addMSWHandler(
  http.post("*/cloudinary/*/upload", () => {
    return HttpResponse.json({
      secure_url: "https://cloudinary.com/test.jpg",
    });
  })
);

// Fácil testar erros
addMSWHandler(
  http.post("*/cloudinary/*/upload", () => {
    return new HttpResponse(null, { status: 500 });
  })
);
```

---

## 🔄 Exemplos de Migração

### Exemplo 1: Teste de Serviço

**ANTES:**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock manual do Prisma
vi.mock("../../../src/lib/prisma", () => ({
  prisma: {
    healthEvent: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

describe("EventService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve criar evento", async () => {
    // Dados manuais
    const newEvent = {
      id: "event-1",
      title: "Consulta",
      date: "2025-12-06",
      startTime: "09:00",
      endTime: "10:00",
      type: "CONSULTA",
      userId: "user-1",
      professionalId: "prof-1",
      files: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.healthEvent.create).mockResolvedValue(newEvent);

    const result = await prisma.healthEvent.create({ data: newEvent });

    expect(result.id).toBe("event-1");
  });
});
```

**DEPOIS:**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { mockPrisma } from "@/tests/__mocks__/global";
import { testDataFactory } from "@/tests/setup/test-factories";
import { healthEventRepository } from "@/repositories";

describe("HealthEventRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve criar evento", async () => {
    // Factory para dados
    const newEvent = testDataFactory.healthEvent.build();

    mockPrisma.healthEvent.create.mockResolvedValue(newEvent);

    const result = await healthEventRepository.create({
      title: newEvent.title,
      date: newEvent.date,
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
      type: newEvent.type,
      user: { connect: { id: newEvent.userId } },
      professional: { connect: { id: newEvent.professionalId } },
    });

    expect(result.id).toBeDefined();
  });
});
```

### Exemplo 2: Teste com API Externa

**ANTES:**

```typescript
import { describe, it, expect, vi } from "vitest";

// Mock manual do fetch
global.fetch = vi.fn();

describe("Cloudinary Upload", () => {
  it("deve fazer upload", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        secure_url: "https://cloudinary.com/test.jpg",
        public_id: "test-123",
      }),
    } as Response);

    const response = await fetch("https://api.cloudinary.com/upload", {
      method: "POST",
      body: new FormData(),
    });

    const data = await response.json();
    expect(data.secure_url).toBeDefined();
  });
});
```

**DEPOIS:**

```typescript
import { describe, it, expect } from "vitest";
import { addMSWHandler } from "@/tests/setup/msw-setup";
import { http, HttpResponse } from "msw";

describe("Cloudinary Upload", () => {
  it("deve fazer upload", async () => {
    // MSW mock realista
    addMSWHandler(
      http.post("*/cloudinary/*/upload", () => {
        return HttpResponse.json({
          secure_url: "https://cloudinary.com/test.jpg",
          public_id: "test-123",
        });
      })
    );

    const response = await fetch(
      "https://api.cloudinary.com/v1_1/test/image/upload",
      {
        method: "POST",
        body: new FormData(),
      }
    );

    const data = await response.json();
    expect(data.secure_url).toBeDefined();
  });

  it("deve tratar erro", async () => {
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

### Exemplo 3: Teste de Integração

**ANTES (Unit com muitos mocks):**

```typescript
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma')
vi.mock('@/services/notification')
vi.mock('@/services/email')

import { prisma } from '@/lib/prisma'
import { createEvent } from '@/actions/events'

describe('createEvent', () => {
  it('deve criar evento e enviar notificação', async () => {
    vi.mocked(prisma.healthEvent.create).mockResolvedValue({...})
    vi.mocked(prisma.notification.create).mockResolvedValue({...})

    // ... muito mock ...
  })
})
```

**DEPOIS (Integration com banco real):**

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma"; // Prisma REAL
import { testDataFactory } from "@/tests/setup/test-factories";
import { createEvent } from "@/actions/events";
import { addMSWHandler } from "@/tests/setup/msw-setup";
import { http, HttpResponse } from "msw";

describe("createEvent - Integration", () => {
  beforeEach(async () => {
    // Limpar apenas as tabelas necessárias
    await prisma.healthEvent.deleteMany();
    await prisma.notification.deleteMany();
  });

  it("deve criar evento e enviar notificação", async () => {
    // Mock apenas email (serviço externo)
    addMSWHandler(
      http.post("*/api/email/send", () => {
        return HttpResponse.json({ success: true });
      })
    );

    // Criar usuário e profissional reais no banco
    const user = await prisma.user.create({
      data: testDataFactory.user.build(),
    });

    const professional = await prisma.professional.create({
      data: testDataFactory.professional.build({ userId: user.id }),
    });

    // Executar ação real
    const event = await createEvent({
      ...testDataFactory.healthEvent.build(),
      userId: user.id,
      professionalId: professional.id,
    });

    // Verificar no banco real
    expect(event.id).toBeDefined();

    const notification = await prisma.notification.findFirst({
      where: { userId: user.id },
    });

    expect(notification).toBeDefined();
  });
});
```

---

## 🎯 Passo a Passo para Migrar um Teste

### 1. Identificar o tipo de teste

- É unit test puro? → Considere mudar para integration
- Testa lógica + banco? → Use banco real
- Testa API externa? → Use MSW

### 2. Substituir mocks manuais do Prisma

```typescript
// Remover:
vi.mock('@/lib/prisma', () => ({ prisma: {...} }))

// Adicionar:
import { mockPrisma } from '@/tests/__mocks__/global'
```

### 3. Substituir dados manuais por factories

```typescript
// Remover:
const testData = { id: '1', name: 'Test', ... }

// Adicionar:
const testData = testDataFactory.user.build()
```

### 4. Substituir fetch mocks por MSW

```typescript
// Remover:
global.fetch = vi.fn().mockResolvedValue({...})

// Adicionar:
import { addMSWHandler } from '@/tests/setup/msw-setup'
addMSWHandler(http.post('*/api/...', () => {...}))
```

### 5. Usar repositórios ao invés do Prisma direto

```typescript
// Antes:
import { prisma } from '@/lib/prisma'
const events = await prisma.healthEvent.findMany({...})

// Depois:
import { healthEventRepository } from '@/repositories'
const events = await healthEventRepository.findMany({...})
```

### 6. Considerar trocar para teste de integração

Se o teste tem muitos mocks do Prisma, provavelmente deveria ser um teste de integração:

```typescript
// Trocar:
describe("My Test - Unit", () => {
  // ... muitos mocks do prisma
});

// Por:
describe("My Test - Integration", () => {
  beforeEach(async () => {
    await prisma.healthEvent.deleteMany();
  });
  // ... usar prisma real
});
```

---

## ⚠️ Pontos de Atenção

### 1. Testes de integração são mais lentos

- Use `beforeEach` para limpar apenas tabelas necessárias
- Não use `prisma.$executeRaw('TRUNCATE ...')` sem necessidade
- Scripts de reset já fazem isso: `pnpm test:unit`

### 2. MSW precisa ser configurado

- Já está configurado em `tests/setup/setup.ts`
- Use `addMSWHandler` para handlers temporários em testes específicos

### 3. Factories devem ser expandidas conforme necessidade

- Adicione novos factories em `tests/setup/test-factories.ts`
- Crie métodos helper quando útil (ex: `userFactory.admin()`)

### 4. Repositórios podem precisar de novos métodos

- Adicione métodos específicos nas interfaces dos repositórios
- Mantenha métodos genéricos na base

---

## 📊 Checklist de Migração

- [ ] Remover mocks manuais do Prisma
- [ ] Importar `mockPrisma` de `@/tests/__mocks__/global`
- [ ] Substituir dados manuais por `testDataFactory`
- [ ] Trocar `global.fetch` por MSW handlers
- [ ] Usar repositórios ao invés do Prisma direto (quando fizer sentido)
- [ ] Considerar trocar para teste de integração se tiver muitos mocks
- [ ] Verificar que mocks são resetados (`beforeEach`)
- [ ] Testar que o teste ainda passa ✅

---

## 🚀 Próximos Passos

Após migrar os testes:

1. Rodar suite completa: `pnpm test`
2. Verificar coverage: `pnpm test:coverage`
3. Atualizar documentação se necessário
4. Considerar adicionar mais testes de integração

---

**Lembre-se**: Migração gradual é melhor que "big bang". Migre teste por teste conforme for tocando neles! 🎯
