# Guia de Implementação de Segurança

## 1. Row-Level Security (RLS)

### O que é RLS?

Row-Level Security é um recurso do PostgreSQL que permite controlar o acesso a linhas individuais de tabelas com base em políticas de segurança. Isso garante que usuários só possam acessar dados aos quais têm permissão, mesmo se um bug na aplicação tentar ler dados indevidos.

### Tabelas com RLS Habilitado

- ✅ `users` - Usuários só podem ver/editar seus próprios dados
- ✅ `health_events` - Eventos médicos isolados por usuário
- ✅ `notifications` - Notificações isoladas por destinatário
- ✅ `reports` - Laudos visíveis apenas para sender/receiver
- ✅ `files` - Arquivos isolados por proprietário do evento/profissional
- ✅ `professionals` - Profissionais isolados por usuário
- ✅ `emissor_info` - Informações de emissor isoladas por usuário

### Como Usar RLS na Aplicação

#### 1. Importar os helpers

```typescript
import {
  setRLSContext,
  clearRLSContext,
  withRLS,
  withSystemRLS,
} from "@/lib/middleware/rls";
```

#### 2. Configurar contexto em rotas autenticadas

Para rotas que requerem autenticação, use o middleware `withRLS`:

```typescript
// app/api/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withRLS } from "@/lib/middleware/rls";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  return withRLS(req, async (req) => {
    // O contexto RLS já está configurado automaticamente
    // Prisma agora só retornará eventos do usuário autenticado
    const events = await prisma.healthEvent.findMany();

    return NextResponse.json(events);
  });
}
```

#### 3. Operações do sistema (APIs públicas)

Para APIs públicas que precisam criar dados para usuários:

```typescript
// app/api/document/submit/route.ts
import { withSystemRLS } from "@/lib/middleware/rls";

export async function POST(req: NextRequest) {
  const { cpf, report } = await req.json();

  // Buscar usuário e criar notificação como sistema
  const result = await withSystemRLS(async () => {
    const user = await prisma.user.findFirst({ where: { cpf } });

    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        type: "LAB_RESULT",
        payload: report,
      },
    });

    return notification;
  });

  return NextResponse.json(result);
}
```

#### 4. Operações administrativas

Para operações que requerem privilégios administrativos:

```typescript
import { withAdminRLS } from "@/lib/middleware/rls";

export async function GET(req: NextRequest) {
  const session = await getServerSession();

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Executar como admin (bypass de RLS)
  const allUsers = await withAdminRLS(session.user.id, async () => {
    return await prisma.user.findMany();
  });

  return NextResponse.json(allUsers);
}
```

### Regras de Segurança (Políticas RLS)

#### Users

- ✅ **SELECT**: Usuário pode ler apenas seus próprios dados; Admin pode ler todos
- ✅ **UPDATE**: Usuário pode atualizar apenas seus próprios dados (exceto role)
- ✅ **DELETE**: Apenas Admin
- ✅ **INSERT**: Aberto para registro público (sign-up)

#### HealthEvents

- ✅ **SELECT**: Usuário vê apenas seus eventos; Admin vê todos
- ✅ **INSERT**: Usuário pode criar apenas para si mesmo
- ✅ **UPDATE**: Usuário pode atualizar apenas seus eventos
- ✅ **DELETE**: Usuário pode deletar apenas seus eventos

#### Notifications

- ✅ **SELECT**: Usuário vê apenas suas notificações
- ✅ **INSERT**: Sistema/Emissor pode criar para qualquer usuário
- ✅ **UPDATE**: Usuário pode atualizar apenas suas notificações
- ✅ **DELETE**: Apenas Admin

#### Reports

- ✅ **SELECT**: Usuário vê reports que enviou ou recebeu
- ✅ **INSERT**: Apenas Emissor/Admin/Sistema
- ✅ **UPDATE**: Sender pode atualizar; Receiver pode marcar como visto
- ✅ **DELETE**: Apenas Sender e Admin

### Testando RLS

Execute os testes de segurança:

```bash
pnpm test tests/unit/security/rls.test.ts
```

### Troubleshooting

**Erro: "não é possível ler dados"**

- Verifique se o contexto RLS foi configurado antes da query
- Confirme que o `userId` e `role` estão corretos

**Erro: "new row violates row-level security policy"**

- Você está tentando criar/atualizar dados sem permissão
- Verifique se está usando `withSystemRLS` para operações do sistema

**Queries retornando vazio inesperadamente**

- RLS pode estar bloqueando dados que você espera acessar
- Confirme que o contexto está configurado corretamente
- Para debug, use `withAdminRLS` temporariamente

---

## 2. Rate Limiting Distribuído

### Implementação

O rate limiting agora usa **APENAS Redis distribuído** (sem fallback Map). Isso garante consistência entre múltiplas instâncias em produção.

### Configurações

```typescript
const RATE_LIMIT = 10; // requisições por IP por hora
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hora
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutos de bloqueio
```

### Comportamento

1. **Dentro do limite**: Requisições são processadas normalmente
2. **Acima do limite**: IP é bloqueado por 15 minutos
3. **Erro no Redis**: Sistema permite requisições (fail-open) para não bloquear serviço

### Desabilitar em Testes

```bash
export RATE_LIMIT_DISABLED=1
```

### Testando Rate Limiting

```bash
pnpm test tests/unit/security/rate-limit-circuit-breaker.test.ts
```

---

## 3. Circuit Breaker com Recuperação Automática

### Estados

- **Closed**: Normal, todas as requisições são processadas
- **Open**: Bloqueado após 5 falhas consecutivas, bloqueia por 15 minutos
- **Half-Open**: Permite 1 requisição de teste após timeout

### Recuperação Automática

O circuit breaker agora implementa recuperação automática:

1. Após 15 minutos em **open**, transiciona para **half-open**
2. Em **half-open**, permite uma requisição de teste
3. Se a requisição de teste **suceder**: volta para **closed**
4. Se a requisição de teste **falhar**: volta para **open**

### Logs

O circuit breaker agora loga todas as transições de estado:

```
[CIRCUIT BREAKER] Falha registrada: 3/5
[CIRCUIT BREAKER] ABERTO após 5 falhas. Bloqueando por 900s
[CIRCUIT BREAKER] Recuperação automática: half-open
[CIRCUIT BREAKER] Recuperação bem-sucedida: closed
```

### Fail-Open

Em caso de erro no Redis, o circuit breaker **permite** requisições (fail-open) para manter disponibilidade do serviço.

---

## 4. Checklist de Segurança

### Antes de Deploy

- [ ] RLS migration aplicada (`20251205151845_complete_rls_implementation`)
- [ ] Variáveis de ambiente configuradas:
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
  - `NEXTAUTH_SECRET`
- [ ] Testes de segurança passando
- [ ] Rate limiting testado em staging
- [ ] Circuit breaker testado em staging

### Monitoramento em Produção

- [ ] Logs de RLS (erros de permissão)
- [ ] Métricas de rate limiting (IPs bloqueados)
- [ ] Estado do circuit breaker (open/closed)
- [ ] Tempo de recuperação do circuit breaker

---

## 5. Conformidade LGPD/GDPR

### Garantias de Privacidade

✅ **Isolamento de Dados**: RLS garante que usuários não podem acessar dados de outros usuários

✅ **Auditoria**: Todas as submissões de documentos são registradas em `AuditLog`

✅ **Minimização de Dados**: Apenas dados necessários são coletados

✅ **Direito ao Esquecimento**: Cascade deletes garantem remoção completa de dados do usuário

### Dados Sensíveis Protegidos

- 📋 Eventos de saúde (`health_events`)
- 🏥 Laudos médicos (`reports`)
- 📁 Arquivos médicos (`files`)
- 👤 Dados pessoais (`users`)
- 🔔 Notificações (`notifications`)

---

## 6. Próximos Passos

### Melhorias Futuras

1. **Autenticação de 2 Fatores (2FA)**

   - Adicionar TOTP para usuários sensíveis (Admin, Emissor)

2. **Criptografia de Arquivos**

   - Criptografar `fileUrl` em `reports` e `files`
   - Usar chave simétrica por usuário

3. **Auditoria Avançada**

   - Registrar todas as operações de leitura (não só escrita)
   - Dashboard de auditoria para admins

4. **Rate Limiting Granular**

   - Limites diferentes por endpoint
   - Limites diferentes por role (Admin, Emissor, Receptor)

5. **Detecção de Anomalias**
   - Machine learning para detectar padrões anormais de acesso
   - Alertas automáticos para admins

---

## 7. Contatos

Para questões de segurança, entre em contato com:

- Email: security@omnib2.com
- Responsável: Equipe de Segurança
