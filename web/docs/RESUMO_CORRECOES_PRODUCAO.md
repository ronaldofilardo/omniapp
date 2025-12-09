# Resumo das Correções - Problemas de Produção

## 📋 Problemas Identificados

### 1. ❌ Funções RLS Ausentes

**Erro:** `ERROR: function set_rls_context(unknown, unknown, boolean) does not exist`

**Causa:** As funções RLS não foram criadas no banco de produção (migrations não aplicadas corretamente).

### 2. ❌ PDFs Não Carregam

**Erro:** "Falha ao carregar PDFs" (mas imagens funcionam)

**Causas possíveis:**

- Content-Type incorreto
- CORS bloqueando recursos
- URLs diretas bloqueadas pelo navegador
- window.open() com PDFs sendo bloqueado

---

## ✅ Soluções Implementadas

### Solução 1: Script para Criar Funções RLS

**Arquivo criado:** `scripts/fix-rls-functions.ts`

**Como usar em produção:**

```powershell
# Execute este comando no servidor de produção
npx tsx scripts/fix-rls-functions.ts
```

**O que faz:**

1. Verifica se as funções `set_rls_context` e `clear_rls_context` existem
2. Cria as funções se estiverem ausentes
3. Valida a criação

**Resultado esperado:**

```
✅ Funções RLS criadas com sucesso!
✓ set_rls_context(): ✅ Existe
✓ clear_rls_context(): ✅ Existe
```

### Solução 2: Correção de Carregamento de PDFs

#### 2.1. Usar API de Download em Vez de URLs Diretas

**Arquivos modificados:**

- `src/components/EventCard.tsx`
- `src/components/RepositoryTab.tsx`

**Mudança:**

```typescript
// ANTES - URLs diretas que podem falhar
window.open(slot.url, "_blank");

// DEPOIS - Usar API que garante Content-Type correto
if (slot.id) {
  const downloadUrl = `/api/files/${slot.id}/download`;
  window.open(downloadUrl, "_blank");
} else {
  window.open(slot.url, "_blank"); // Fallback
}
```

**Benefícios:**

- ✅ Content-Type correto (`application/pdf`)
- ✅ Autenticação e autorização
- ✅ Logs de acesso
- ✅ Bypass de problemas de CORS
- ✅ Compatibilidade com todos os navegadores

#### 2.2. Headers Corretos no Next.js

**Arquivo modificado:** `next.config.mjs`

**Adicionado:**

```javascript
async headers() {
  return [
    // PDFs com Content-Type correto
    {
      source: '/uploads/:path*.pdf',
      headers: [
        { key: 'Content-Type', value: 'application/pdf' },
        { key: 'Content-Disposition', value: 'inline' },
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    // Imagens otimizadas
    {
      source: '/uploads/:path*.(jpg|jpeg|png|gif|webp)',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    // CORS para APIs
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Credentials', value: 'true' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
        { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
      ],
    },
  ]
}
```

**Benefícios:**

- ✅ PDFs servidos com Content-Type correto
- ✅ Cache otimizado
- ✅ Suporte a CORS quando necessário

---

## 📚 Documentação Criada

**Arquivo:** `docs/TROUBLESHOOTING_PRODUCAO.md`

Contém:

- ✅ Guia completo de troubleshooting
- ✅ Diagnósticos passo a passo
- ✅ Scripts de teste
- ✅ Comandos de emergência
- ✅ Checklist de verificação pós-deploy

---

## 🚀 Próximos Passos para Deploy

### 1. Testar Localmente

```powershell
# Rebuild do projeto
pnpm build

# Testar em modo produção
pnpm start

# Verificar se PDFs carregam corretamente
```

### 2. Deploy para Produção

```powershell
# Fazer commit das mudanças
git add .
git commit -m "fix: Corrigir funções RLS e carregamento de PDFs"
git push origin master

# Após deploy, executar no servidor de produção
npx tsx scripts/fix-rls-functions.ts
```

### 3. Verificar em Produção

- [ ] Logs sem erros RLS
- [ ] PDFs carregam corretamente
- [ ] Imagens continuam funcionando
- [ ] Performance normal

---

## 🔍 Como Verificar se Funcionou

### Verificar Funções RLS

Conecte ao banco de produção e execute:

```sql
SELECT proname, prosrc FROM pg_proc WHERE proname LIKE '%rls%';
```

Deve retornar:

- `set_rls_context`
- `clear_rls_context`

### Verificar PDFs

1. Faça login na aplicação
2. Abra um evento que tenha PDF anexado
3. Clique no botão "Visualizar" do PDF
4. O PDF deve abrir em nova aba
5. Verifique o console do navegador (F12) - não deve ter erros

### Verificar Logs do Servidor

Os logs devem mostrar:

```
✅ [RLS] Contexto configurado: userId=..., role=..., isSystem=...
```

E NÃO devem mostrar:

```
❌ [RLS] ❌ Erro ao configurar contexto
❌ [RLS] Tentando configuração de fallback...
```

---

## 🆘 Se Ainda Não Funcionar

### Para PDFs:

1. Abra o console do navegador (F12)
2. Vá para a aba "Network"
3. Tente carregar o PDF
4. Verifique a resposta HTTP:
   - Status deve ser 200
   - Content-Type deve ser `application/pdf`
   - Se 403/401: problema de autorização
   - Se 404: arquivo não encontrado

### Para RLS:

1. Verifique os logs do servidor
2. Execute o script de diagnóstico:
   ```powershell
   npx tsx scripts/diagnose-rls-issue.ts
   ```
3. Se persistir, considere desabilitar RLS temporariamente (ver TROUBLESHOOTING_PRODUCAO.md)

---

## 📝 Resumo das Mudanças

| Arquivo                             | Mudança      | Motivo                         |
| ----------------------------------- | ------------ | ------------------------------ |
| `scripts/fix-rls-functions.ts`      | Novo arquivo | Criar funções RLS ausentes     |
| `src/components/EventCard.tsx`      | Modificado   | Usar API de download para PDFs |
| `src/components/RepositoryTab.tsx`  | Modificado   | Usar API de download para PDFs |
| `next.config.mjs`                   | Modificado   | Headers corretos para PDFs     |
| `docs/TROUBLESHOOTING_PRODUCAO.md`  | Novo arquivo | Guia de troubleshooting        |
| `docs/RESUMO_CORRECOES_PRODUCAO.md` | Novo arquivo | Este resumo                    |

---

## ✅ Testes Recomendados

- [ ] Upload de PDF funciona
- [ ] Visualização de PDF funciona
- [ ] Download de PDF funciona
- [ ] Upload de imagem funciona
- [ ] Visualização de imagem funciona
- [ ] RLS logs sem erros
- [ ] Notificações carregam rápido (< 2s)
- [ ] Eventos carregam corretamente
- [ ] Arquivos órfãos são listados
- [ ] Performance geral aceitável
