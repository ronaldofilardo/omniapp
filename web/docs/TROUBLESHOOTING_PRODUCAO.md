# Guia de Troubleshooting - Problemas em Produção

## 🔴 Problema 1: Funções RLS Não Existem

### Sintomas
```
ERROR: function set_rls_context(unknown, unknown, boolean) does not exist
ERROR: function clear_rls_context() does not exist
```

### Causa
As funções de Row-Level Security (RLS) não foram criadas no banco de dados de produção. Isso acontece quando:
- As migrations não foram executadas corretamente
- O banco de produção foi criado antes da migration RLS
- Houve rollback acidental das migrations

### Solução

#### Opção 1: Executar o Script de Correção (Recomendado)
```powershell
# Em produção, executar:
npx tsx scripts/fix-rls-functions.ts
```

Este script:
1. Verifica se as funções existem
2. Cria as funções se estiverem ausentes
3. Valida a criação

#### Opção 2: Executar SQL Manualmente
Conecte ao banco de produção e execute:

```sql
-- Função para definir o contexto do usuário
CREATE OR REPLACE FUNCTION set_rls_context(user_id TEXT, user_role TEXT, is_system BOOLEAN DEFAULT false)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.user_id', user_id, false);
  PERFORM set_config('app.role', user_role, false);
  PERFORM set_config('app.system', is_system::text, false);
END;
$$ LANGUAGE plpgsql;

-- Função para limpar o contexto
CREATE OR REPLACE FUNCTION clear_rls_context()
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.user_id', '', false);
  PERFORM set_config('app.role', '', false);
  PERFORM set_config('app.system', 'false', false);
END;
$$ LANGUAGE plpgsql;
```

#### Opção 3: Reexecutar Migrations
```powershell
# Em produção
npx prisma migrate deploy
```

### Verificação
Após aplicar a solução, verifique os logs do servidor. Você NÃO deve mais ver:
- `[RLS] ❌ Erro ao configurar contexto`
- `[RLS] Tentando configuração de fallback...`

---

## 🔴 Problema 2: PDFs Não Carregam (Imagens Funcionam)

### Sintomas
- Imagens carregam normalmente
- PDFs mostram "Falha ao carregar PDFs"
- Erro pode aparecer no console do navegador

### Causas Possíveis

#### 1. **Content-Type Incorreto**
O servidor pode estar servindo PDFs com Content-Type errado.

**Verificação:**
```powershell
# Teste a URL do PDF no navegador e verifique o Content-Type
# Deve ser: application/pdf
```

**Solução:**
Adicione headers corretos no `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  output: "standalone",
  async headers() {
    return [
      {
        source: '/uploads/:path*.pdf',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/pdf',
          },
          {
            key: 'Content-Disposition',
            value: 'inline',
          },
        ],
      },
    ]
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
```

#### 2. **CORS (Cross-Origin Resource Sharing)**
Se os PDFs estão em domínio diferente (ex: Vercel Blob Storage), pode haver bloqueio CORS.

**Verificação:**
Abra o console do navegador (F12) e procure por erros CORS.

**Solução:**
Adicione headers CORS no `next.config.mjs`:

```javascript
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Credentials', value: 'true' },
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
        { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
      ],
    },
    {
      source: '/uploads/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET' },
      ],
    },
  ]
}
```

#### 3. **URLs com window.open() Bloqueadas**
Alguns navegadores bloqueiam `window.open()` para PDFs por segurança.

**Solução:**
Modificar `EventCard.tsx` para usar iframe ou link direto:

```tsx
// Em vez de window.open(slot.url, '_blank')
// Usar:
if (slot.url.endsWith('.pdf') || slot.url.includes('application/pdf')) {
  // Para PDFs, usar iframe ou link direto
  setPreviewFile({
    file: null,
    type: slot.type,
    url: slot.url,
  })
} else {
  window.open(slot.url, '_blank')
}
```

E no modal de preview, adicionar suporte para iframe:

```tsx
{previewFile.url && previewFile.url.endsWith('.pdf') ? (
  <iframe
    src={previewFile.url}
    className="w-full h-[600px]"
    title="Preview PDF"
  />
) : previewFile.url?.startsWith('data:image/') ? (
  <img src={previewFile.url} alt={previewFile.type} />
) : (
  // ... restante do código
)}
```

#### 4. **Permissões RLS no Banco**
PDFs podem estar com permissões RLS diferentes de imagens.

**Verificação:**
```sql
-- Verificar políticas RLS na tabela files
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'files';
```

**Solução:**
Se as políticas estiverem muito restritivas, ajuste conforme necessário.

#### 5. **URLs Blob Storage Expiradas**
Se usando Vercel Blob, as URLs podem ter expirado.

**Verificação:**
Teste a URL do PDF diretamente no navegador. Se der 403/404, a URL expirou.

**Solução:**
- Usar URLs com tokens de longa duração
- Ou implementar proxy de download via API route

### Teste Rápido de Diagnóstico

Execute este script no console do navegador:

```javascript
// Cole esta URL de um PDF que não carrega
const pdfUrl = 'SUA_URL_AQUI';

fetch(pdfUrl)
  .then(response => {
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    console.log('Content-Disposition:', response.headers.get('content-disposition'));
    return response.blob();
  })
  .then(blob => {
    console.log('Blob Size:', blob.size);
    console.log('Blob Type:', blob.type);
    // Tentar abrir o blob
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  })
  .catch(error => {
    console.error('Erro:', error);
  });
```

### Solução Recomendada para Produção

**Criar uma API Route de Proxy para PDFs:**

```typescript
// src/app/api/files/[id]/download/route.ts
// Já existe, mas garantir que está sendo usada!

// No EventCard.tsx, modificar para usar a API:
if (slot.url) {
  if (slot.url.startsWith('data:')) {
    setPreviewFile({ file: null, type: slot.type, url: slot.url })
  } else if (slot.id) {
    // Usar API de download em vez de abrir URL direta
    const downloadUrl = `/api/files/${slot.id}/download`
    window.open(downloadUrl, '_blank')
  } else {
    window.open(slot.url, '_blank')
  }
}
```

Isso garante:
- Autenticação e autorização
- Content-Type correto
- Logs de acesso
- Bypass de CORS

---

## 📋 Checklist de Verificação Pós-Deploy

### Banco de Dados
- [ ] Funções RLS criadas (`set_rls_context`, `clear_rls_context`)
- [ ] Todas as migrations aplicadas (`npx prisma migrate deploy`)
- [ ] Políticas RLS ativas nas tabelas sensíveis
- [ ] Seeds de dados executados se necessário

### Arquivos e Storage
- [ ] URLs de arquivos acessíveis
- [ ] Content-Type correto para PDFs
- [ ] Permissões corretas em arquivos
- [ ] CORS configurado se necessário

### Monitoramento
- [ ] Logs sem erros RLS
- [ ] PDFs carregando corretamente
- [ ] Imagens carregando corretamente
- [ ] Performance aceitável (< 2s para rotas críticas)

### Configuração
- [ ] Variáveis de ambiente corretas
- [ ] `next.config.mjs` com headers adequados
- [ ] Rate limiting configurado
- [ ] Audit logs funcionando

---

## 🚨 Comandos de Emergência

### Desabilitar RLS Temporariamente (CUIDADO!)
```sql
-- APENAS EM EMERGÊNCIA - Remove segurança!
ALTER TABLE health_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE files DISABLE ROW LEVEL SECURITY;
-- ... outras tabelas
```

### Forçar Recriar Funções RLS
```sql
DROP FUNCTION IF EXISTS set_rls_context(TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS clear_rls_context();
-- Então executar o script fix-rls-functions.ts
```

### Verificar Status Geral do Banco
```sql
-- Listar todas as funções
SELECT proname, prosrc FROM pg_proc WHERE proname LIKE '%rls%';

-- Listar tabelas com RLS habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE rowsecurity = true;

-- Listar todas as políticas
SELECT * FROM pg_policies;
```

---

## 📞 Suporte

Se os problemas persistirem:
1. Colete logs completos (`console.log` do navegador + logs do servidor)
2. Teste URLs diretamente no navegador
3. Verifique variáveis de ambiente
4. Execute os scripts de diagnóstico fornecidos
5. Documente exatamente quando o erro ocorre (ação do usuário)
