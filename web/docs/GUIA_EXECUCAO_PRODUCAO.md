# 🚀 Guia: Como Executar Scripts em Produção

## 📋 Contexto

Após deploy em produção, você precisa executar o script `fix-rls-functions.ts` para criar as funções RLS ausentes no banco de dados.

## 🔧 Métodos de Execução

### Método 1: Usando Script NPM (Recomendado)

**Pré-requisitos:**

- Acesso SSH ao servidor de produção
- Node.js e pnpm instalados
- Projeto já deployado

**Passos:**

1. **Conectar ao servidor:**

   ```bash
   ssh usuario@servidor-producao
   ```

2. **Navegar para o diretório do projeto:**

   ```bash
   cd /caminho/para/o/projeto/web
   ```

3. **Executar o script:**

   ```bash
   # Usando pnpm (recomendado)
   pnpm run fix:rls

   # Ou usando npm
   npm run fix:rls

   # Ou diretamente com npx
   npx tsx scripts/fix-rls-functions.ts
   ```

   **Saída esperada:**

   ```
   🔍 Verificando funções RLS no banco de dados...

   Status das funções:
     ✓ set_rls_context(): ❌ Não encontrada
     ✓ clear_rls_context(): ❌ Não encontrada

   🔧 Criando funções RLS ausentes...
   ✅ Funções RLS criadas com sucesso!

   Verificação pós-criação:
     ✓ set_rls_context(): ✅ Existe
     ✓ clear_rls_context(): ✅ Existe

   ✅ Script concluído com sucesso!
   ```

### Método 2: Usando ts-node Diretamente

Se `tsx` não estiver disponível, use `ts-node`:

```bash
# Instalar ts-node se necessário
npm install -g ts-node typescript

# Executar o script
NODE_ENV=production ts-node --transpile-only scripts/fix-rls-functions.ts
```

### Método 3: Via Docker (se aplicável)

Se sua aplicação roda em Docker:

```bash
# Entrar no container
docker exec -it nome-do-container bash

# Executar dentro do container
cd /app
pnpm run fix:rls
```

### Método 4: Via PM2 (se usa PM2)

```bash
# Se usa PM2 para gerenciar processos
pm2 restart app
# Ou executar diretamente no servidor
NODE_ENV=production npx tsx scripts/fix-rls-functions.ts
```

---

## ⚙️ Configuração de Ambiente

### Variáveis de Ambiente Necessárias

Certifique-se de que estas variáveis estão configuradas:

```bash
# No arquivo .env.production ou equivalente
NODE_ENV=production
DATABASE_URL="postgresql://usuario:senha@host:porta/database?schema=public"

# Outras variáveis que podem ser necessárias
NEXTAUTH_SECRET="sua-secret"
NEXTAUTH_URL="https://seu-dominio.com"
```

### Verificar Conexão com Banco

Antes de executar, teste a conexão:

```bash
# Testar conexão com banco
npx prisma db push --preview-feature

# Ou verificar se o banco está acessível
psql "$DATABASE_URL" -c "SELECT version();"
```

---

## 🔍 Verificação Pós-Execução

### 1. Verificar se as funções foram criadas:

```sql
-- Conectar ao banco PostgreSQL
psql "$DATABASE_URL"

-- Verificar funções
SELECT proname FROM pg_proc WHERE proname LIKE '%rls%';

-- Deve retornar:
-- set_rls_context
-- clear_rls_context
```

### 2. Verificar logs da aplicação:

```bash
# Verificar logs da aplicação
tail -f /var/log/app.log

# Ou se usa PM2:
pm2 logs
```

**Logs esperados:**

```
✅ [RLS] Contexto configurado: userId=..., role=..., isSystem=...
```

**Logs que NÃO devem aparecer:**

```
❌ [RLS] ❌ Erro ao configurar contexto
❌ [RLS] Tentando configuração de fallback...
```

### 3. Testar funcionalidade:

- Acesse a aplicação em produção
- Faça login
- Verifique se as notificações carregam sem erros RLS
- Teste upload/download de arquivos

---

## 🆘 Troubleshooting

### Erro: "tsx command not found"

**Solução:**

```bash
# Instalar tsx globalmente
npm install -g tsx

# Ou usar npx
npx tsx scripts/fix-rls-functions.ts
```

### Erro: "Cannot find module 'scripts/fix-rls-functions.ts'"

**Sintomas:**

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\apps\HM\Omni\scripts\fix-rls-functions.ts'
```

**Causa:** O comando foi executado no diretório raiz do projeto em vez do diretório `web`.

**Solução:**

```bash
# Execute no diretório correto
cd web
npx tsx scripts/fix-rls-functions.ts

# Ou execute diretamente:
cd web && npx tsx scripts/fix-rls-functions.ts
```

### Erro: "cannot insert multiple commands into a prepared statement"

**Sintomas:**

```
ERROR: cannot insert multiple commands into a prepared statement
```

**Causa:** O script tentou executar múltiplas declarações SQL em uma única chamada.

**Status:** ✅ **CORRIGIDO** - O script agora executa cada função separadamente.

**Solução:**

```bash
# Verificar DATABASE_URL
echo $DATABASE_URL

# Testar conexão
psql "$DATABASE_URL" -c "SELECT 1;"

# Verificar se o banco está rodando
netstat -tlnp | grep 5432
```

### Erro: "Permission denied"

**Solução:**

```bash
# Verificar permissões do usuário
whoami
id

# Executar com sudo se necessário (CUIDADO!)
sudo -u app-user pnpm run fix:rls
```

### Erro: "Script timeout"

**Solução:**

```bash
# Aumentar timeout se necessário
timeout 300 npx tsx scripts/fix-rls-functions.ts

# Ou executar em background
nohup npx tsx scripts/fix-rls-functions.ts &
```

---

## 📝 Scripts Alternativos

### Executar via curl (se API estiver disponível):

```bash
# Se você criou uma API route para isso
curl -X POST https://seu-dominio.com/api/admin/fix-rls \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Executar via SSH remoto:

```bash
# Executar remotamente sem login interativo
ssh usuario@servidor 'cd /path/to/project && pnpm run fix:rls'
```

---

## 🔒 Segurança

- ✅ Execute apenas em ambiente de produção controlado
- ✅ Faça backup do banco antes de executar
- ✅ Monitore logs durante e após execução
- ✅ Teste em staging primeiro se possível
- ✅ Use variáveis de ambiente seguras

---

## 📞 Suporte

Se encontrar problemas:

1. **Colete informações:**

   - Logs completos do script
   - Configuração do banco
   - Versão do Node.js (`node --version`)
   - Sistema operacional

2. **Verifique documentação:**

   - `docs/TROUBLESHOOTING_PRODUCAO.md`
   - `docs/RESUMO_CORRECOES_PRODUCAO.md`

3. **Execute diagnóstico:**
   ```bash
   # Script de diagnóstico (se existir)
   npx tsx scripts/diagnose-rls-issue.ts
   ```

---

## ✅ Checklist de Execução

- [ ] Backup do banco realizado
- [ ] Variáveis de ambiente configuradas
- [ ] Conexão com banco testada
- [ ] Script executado com sucesso
- [ ] Funções RLS criadas no banco
- [ ] Logs sem erros RLS
- [ ] Funcionalidades testadas
- [ ] Monitoramento ativo
