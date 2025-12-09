# Exemplo de Integração do RLS em Rotas Existentes

## Exemplo 1: Rota de Listagem de Eventos

### ANTES (sem RLS)

```typescript
// app/api/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await auth();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // PROBLEMA: Query manual filtra por userId, mas se houver bug,
  // pode vazar dados de outros usuários
  const events = await prisma.healthEvent.findMany({
    where: { userId: user.id }, // Filtro manual - pode ser esquecido!
    include: {
      professional: true,
      files: true,
    },
  });

  return NextResponse.json(events);
}
```

### DEPOIS (com RLS)

```typescript
// app/api/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRLS } from "@/lib/middleware/rls";

export async function GET(req: NextRequest) {
  // withRLS configura automaticamente o contexto RLS
  return withRLS(req, async (req) => {
    // RLS garante que APENAS eventos do usuário autenticado são retornados
    // Mesmo sem WHERE, o PostgreSQL filtra automaticamente!
    const events = await prisma.healthEvent.findMany({
      // Não precisa mais de: where: { userId: user.id }
      include: {
        professional: true,
        files: true,
      },
    });

    return NextResponse.json(events);
  });
}

export async function POST(req: NextRequest) {
  return withRLS(req, async (req) => {
    const body = await req.json();

    // RLS garante que só pode criar evento para si mesmo
    // Mesmo se passar userId diferente, o PostgreSQL bloqueia!
    const event = await prisma.healthEvent.create({
      data: {
        title: body.title,
        date: body.date,
        type: body.type,
        userId: body.userId, // RLS valida se é o usuário autenticado
        professionalId: body.professionalId,
        startTime: body.startTime,
        endTime: body.endTime,
      },
    });

    return NextResponse.json(event, { status: 201 });
  });
}
```

---

## Exemplo 2: Rota de Reports (Sender/Receiver)

### ANTES (sem RLS)

```typescript
// app/api/reports/route.ts
export async function GET(req: NextRequest) {
  const user = await auth();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // PROBLEMA: Query complexa, fácil esquecer algum caso
  const reports = await prisma.report.findMany({
    where: {
      OR: [{ senderId: user.id }, { receiverId: user.id }],
    },
  });

  return NextResponse.json(reports);
}
```

### DEPOIS (com RLS)

```typescript
// app/api/reports/route.ts
export async function GET(req: NextRequest) {
  return withRLS(req, async (req) => {
    // RLS automaticamente filtra por senderId OU receiverId
    const reports = await prisma.report.findMany();

    return NextResponse.json(reports);
  });
}
```

---

## Exemplo 3: API Pública (Document Submit)

### ANTES (sem RLS)

```typescript
// app/api/document/submit/route.ts
export async function POST(req: NextRequest) {
  const { cpf, report } = await req.json();

  // Buscar usuário
  const user = await prisma.user.findFirst({ where: { cpf } });

  if (!user) {
    return NextResponse.json(
      { error: "Usuário não encontrado" },
      { status: 404 }
    );
  }

  // PROBLEMA: Criar como "sistema" sem contexto RLS
  const notification = await prisma.notification.create({
    data: {
      userId: user.id,
      type: "LAB_RESULT",
      payload: report,
    },
  });

  return NextResponse.json({ notificationId: notification.id });
}
```

### DEPOIS (com RLS)

```typescript
// app/api/document/submit/route.ts
import { withSystemRLS } from "@/lib/middleware/rls";

export async function POST(req: NextRequest) {
  const { cpf, report } = await req.json();

  // Operação como sistema (permite criar notificação para usuário)
  const result = await withSystemRLS(async () => {
    const user = await prisma.user.findFirst({ where: { cpf } });

    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        type: "LAB_RESULT",
        payload: report,
      },
    });

    return { notificationId: notification.id };
  });

  return NextResponse.json(result);
}
```

---

## Exemplo 4: Rota Admin

### ANTES (sem RLS)

```typescript
// app/api/admin/users/route.ts
export async function GET(req: NextRequest) {
  const user = await auth();

  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  // Buscar todos os usuários
  const users = await prisma.user.findMany();

  return NextResponse.json(users);
}
```

### DEPOIS (com RLS)

```typescript
// app/api/admin/users/route.ts
import { auth } from "@/lib/auth";
import { withAdminRLS } from "@/lib/middleware/rls";

export async function GET(req: NextRequest) {
  const user = await auth();

  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  // Executar como admin (bypass de RLS)
  const users = await withAdminRLS(user.id, async () => {
    return await prisma.user.findMany({
      include: {
        events: true,
        notifications: true,
      },
    });
  });

  return NextResponse.json(users);
}
```

---

## Exemplo 5: Server Action

### ANTES (sem RLS)

```typescript
// actions/events.ts
"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function createEvent(data: EventData) {
  const user = await auth();

  if (!user) {
    throw new Error("Não autenticado");
  }

  const event = await prisma.healthEvent.create({
    data: {
      ...data,
      userId: user.id, // Manual
    },
  });

  return event;
}
```

### DEPOIS (com RLS)

```typescript
// actions/events.ts
"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { setRLSContext, clearRLSContext } from "@/lib/middleware/rls";

export async function createEvent(data: EventData) {
  const user = await auth();

  if (!user) {
    throw new Error("Não autenticado");
  }

  try {
    // Configurar contexto RLS
    await setRLSContext(user.id, user.role);

    // RLS garante que só pode criar para si mesmo
    const event = await prisma.healthEvent.create({
      data: {
        ...data,
        userId: user.id,
      },
    });

    return event;
  } finally {
    // Sempre limpar contexto
    await clearRLSContext();
  }
}
```

---

## Padrões de Uso

### ✅ Padrão 1: Rotas API com Autenticação

```typescript
export async function GET(req: NextRequest) {
  return withRLS(req, async (req) => {
    // Seu código aqui
    const data = await prisma.model.findMany();
    return NextResponse.json(data);
  });
}
```

### ✅ Padrão 2: APIs Públicas (Sistema)

```typescript
export async function POST(req: NextRequest) {
  const body = await req.json();

  const result = await withSystemRLS(async () => {
    // Operações como sistema
    return await prisma.notification.create({ ... });
  });

  return NextResponse.json(result);
}
```

### ✅ Padrão 3: Operações Admin

```typescript
export async function GET(req: NextRequest) {
  const user = await auth();

  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await withAdminRLS(user.id, async () => {
    return await prisma.user.findMany();
  });

  return NextResponse.json(data);
}
```

### ✅ Padrão 4: Server Actions

```typescript
"use server";

export async function myAction(data: Data) {
  const user = await auth();
  if (!user) throw new Error("Unauthorized");

  try {
    await setRLSContext(user.id, user.role);
    const result = await prisma.model.create({ data });
    return result;
  } finally {
    await clearRLSContext();
  }
}
```

---

## Benefícios do RLS

### 🔒 Segurança em Camadas

1. **Aplicação**: Validação de autenticação
2. **RLS**: Isolamento de dados no banco
3. **Auditoria**: Log de todas as operações

### 🐛 Proteção contra Bugs

Mesmo se você esquecer de filtrar por `userId`, o RLS protege:

```typescript
// ❌ ANTES: Vazaria dados de todos os usuários
const events = await prisma.healthEvent.findMany();

// ✅ DEPOIS: RLS filtra automaticamente
return withRLS(req, async () => {
  const events = await prisma.healthEvent.findMany();
  // Retorna apenas eventos do usuário autenticado!
  return NextResponse.json(events);
});
```

### 🧪 Testabilidade

RLS facilita testes de isolamento de dados:

```typescript
test("usuário não pode ver eventos de outros", async () => {
  await setRLSContext(user1.id, "RECEPTOR");
  const events = await prisma.healthEvent.findMany();

  // RLS garante que só eventos do user1 são retornados
  expect(events.every((e) => e.userId === user1.id)).toBe(true);
});
```

---

## Checklist de Migração

Para migrar uma rota existente para usar RLS:

- [ ] Importar `withRLS`, `withSystemRLS` ou `withAdminRLS`
- [ ] Envolver handler em `withRLS(req, async (req) => { ... })`
- [ ] Remover filtros manuais por `userId` (RLS faz isso)
- [ ] Adicionar testes de isolamento de dados
- [ ] Verificar logs em produção

---

## Troubleshooting

### Erro: "new row violates row-level security policy"

**Causa**: Tentando criar dados sem permissão

**Solução**: Use `withSystemRLS` para operações do sistema:

```typescript
await withSystemRLS(async () => {
  await prisma.notification.create({ ... });
});
```

### Queries Retornando Vazio

**Causa**: Contexto RLS não configurado ou usuário não tem permissão

**Solução**:

1. Verifique se `withRLS` está sendo usado
2. Confirme que o usuário está autenticado
3. Para debug, use `withAdminRLS` temporariamente

### Erro: "não é possível ler dados"

**Causa**: Contexto RLS mal configurado

**Solução**:

1. Verifique se `userId` e `role` estão corretos
2. Use `clearRLSContext()` antes de configurar novo contexto
3. Sempre use `try/finally` para garantir limpeza

---

## Conclusão

O RLS adiciona uma camada de segurança **crítica** ao nível do banco de dados, protegendo contra:

- ✅ Bugs de lógica de negócio
- ✅ Esquecimento de filtros por usuário
- ✅ Ataques de acesso indevido
- ✅ Violações de LGPD/GDPR

Use os padrões acima para migrar suas rotas gradualmente!
