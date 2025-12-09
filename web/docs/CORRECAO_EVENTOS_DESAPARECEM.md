# Correção do Problema: Eventos Desaparecem Após Upload de Arquivos

## 🔴 PROBLEMA IDENTIFICADO

**Sintoma:** Em produção, após fazer upload de arquivos via card de evento, o evento desaparece da timeline e do repositório. Contudo, ao tentar criar um novo evento no mesmo horário, dá mensagem de que já existe um evento.

**Causa Raiz:** Row Level Security (RLS) está ATIVADO no PostgreSQL mas o contexto RLS não está sendo configurado corretamente, fazendo com que as policies bloqueiem o acesso aos eventos.

## 📊 DIAGNÓSTICO

### Estado Atual

- ✅ RLS foi habilitado em 5/dez/2025 via migration `20251205151845_complete_rls_implementation`
- ✅ Policies RLS estão criadas para todas as tabelas
- ❌ Middleware RLS (`withRLS`) não está lidando com falhas silenciosas
- ❌ Contexto RLS pode não estar sendo configurado antes de queries Prisma
- ❌ Eventos existem no banco mas estão "invisíveis" devido às policies RLS

### Por que a validação de duplicata funciona?

A query de validação de sobreposição provavelmente não está respeitando completamente as policies RLS, encontrando o evento "invisível" e bloqueando a criação de um novo.

## 🔧 SOLUÇÕES

### Solução Imediata (Produção)

**OPÇÃO 1: Desabilitar RLS Temporariamente** ⚠️

```bash
# Em produção, execute:
cd web
npx tsx scripts/disable-rls-temp.ts
```

Isso irá:

- Desabilitar RLS em todas as tabelas
- Restaurar acesso imediato aos eventos
- Permitir que a aplicação funcione normalmente

**IMPORTANTE:** Esta é uma solução TEMPORÁRIA. O RLS é importante para conformidade LGPD/GDPR.

**OPÇÃO 2: Corrigir Middleware RLS** ✅ (Recomendado)

As correções já foram implementadas no código:

1. **Melhor tratamento de erros** em `setRLSContext()` com fallback
2. **Logs detalhados** para debugging
3. **Sanitização de inputs** para prevenir SQL injection

Para aplicar em produção:

```bash
git pull origin master
pnpm build
# Deploy via Vercel ou seu processo normal
```

### Solução Permanente

#### 1. Executar Diagnóstico

```bash
cd web
npx tsx scripts/diagnose-rls-issue.ts
```

Isso irá mostrar:

- Status do RLS em cada tabela
- Policies ativas
- Contexto RLS atual
- Eventos invisíveis (se houver)
- Recomendações específicas

#### 2. Verificar Configuração do Middleware

Certifique-se de que TODAS as rotas de API estão usando `withRLS`:

```typescript
// ✅ CORRETO
export async function GET(req: NextRequest) {
  return withRLS(req, async (req) => {
    // sua lógica aqui
  });
}

// ❌ INCORRETO - Sem withRLS
export async function GET(req: NextRequest) {
  const user = await auth();
  // queries diretas sem contexto RLS
}
```

#### 3. Verificar Função set_rls_context no Banco

```sql
-- Conectar ao banco e executar:
SELECT set_rls_context('user-id-test', 'RECEPTOR', false);

-- Verificar se configurou:
SELECT
  current_setting('app.user_id', true) as user_id,
  current_setting('app.role', true) as role,
  current_setting('app.system', true) as system;
```

Se a função não existir ou falhar, execute:

```bash
cd web/prisma
# Reexecutar migration RLS
npx prisma migrate deploy
```

#### 4. Teste Completo

Após as correções:

```bash
# 1. Reabilitar RLS
npx tsx scripts/enable-rls.ts

# 2. Reiniciar aplicação
pnpm build && pnpm start

# 3. Testar fluxo completo:
#    - Login
#    - Criar evento
#    - Upload de arquivos
#    - Verificar se evento continua visível
#    - Editar evento
#    - Deletar arquivo
```

## 🔍 MONITORAMENTO

### Logs a Observar

Em produção, monitore logs para:

```
[RLS] Contexto configurado: userId=..., role=..., isSystem=...
[RLS] ✅ Fallback bem-sucedido
[RLS] ❌ Erro ao configurar contexto
```

Se aparecer frequentemente "❌ Erro ao configurar contexto", significa que a função `set_rls_context` não existe ou está falhando.

### Query para Verificar Eventos Invisíveis

```sql
-- Total de eventos (sem RLS)
SELECT COUNT(*) FROM health_events;

-- Eventos do usuário (com RLS)
SET app.user_id = 'seu-user-id';
SET app.role = 'RECEPTOR';
SELECT COUNT(*) FROM health_events WHERE "userId" = 'seu-user-id';
```

Se houver diferença, eventos estão invisíveis devido ao RLS.

## 📋 CHECKLIST DE CORREÇÃO

- [ ] Executar `diagnose-rls-issue.ts` para confirmar problema
- [ ] Decidir: desabilitar RLS temporariamente OU aplicar correções
- [ ] Se desabilitar: executar `disable-rls-temp.ts`
- [ ] Se corrigir:
  - [ ] Deploy do código corrigido
  - [ ] Verificar função `set_rls_context` no banco
  - [ ] Testar fluxo completo
  - [ ] Executar `enable-rls.ts` se estava desabilitado
- [ ] Monitorar logs por 24h
- [ ] Confirmar que eventos não desaparecem mais

## 🚨 PREVENÇÃO FUTURA

### Testes Automatizados

Criar testes que verificam:

```typescript
describe('RLS Context', () => {
  it('should maintain event visibility after file upload', async () => {
    // 1. Criar evento
    const event = await createEvent(...)

    // 2. Upload arquivo
    await uploadFile(event.id, ...)

    // 3. Verificar evento ainda visível
    const events = await getEvents(userId)
    expect(events).toContainEqual(expect.objectContaining({ id: event.id }))
  })
})
```

### Alertas

Configurar alerta se:

- Número de eventos visíveis < número total de eventos
- Logs de erro RLS aumentarem
- Usuários reportarem eventos desaparecidos

## 📞 SUPORTE

Se o problema persistir após estas correções:

1. **Coletar logs:**

   ```bash
   npx tsx scripts/diagnose-rls-issue.ts > diagnostico.txt
   ```

2. **Verificar Vercel/Produção:**

   - Logs de runtime
   - Variáveis de ambiente
   - Versão do Prisma
   - Conexão com banco

3. **Verificar banco diretamente:**

   ```sql
   -- Ver últimos eventos criados
   SELECT * FROM health_events
   ORDER BY "createdAt" DESC
   LIMIT 10;

   -- Ver policies ativas
   SELECT * FROM pg_policies
   WHERE tablename = 'health_events';
   ```

## ⏱️ ESTIMATIVA DE TEMPO

- **Diagnóstico:** 5-10 minutos
- **Solução temporária (desabilitar RLS):** 2 minutos
- **Solução permanente (corrigir middleware):** 30-60 minutos
- **Testes completos:** 20-30 minutos
- **Total:** 1-2 horas

## ✅ CONCLUSÃO

O problema é totalmente corrigível. A causa raiz foi identificada (RLS mal configurado) e as correções foram implementadas. Escolha a abordagem adequada ao seu ambiente:

- **Produção crítica:** Desabilite RLS temporariamente, corrija depois
- **Ambiente controlado:** Aplique correções diretamente

Qualquer dúvida, consulte este documento ou execute os scripts de diagnóstico.
