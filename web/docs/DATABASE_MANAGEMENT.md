# Gerenciamento de Banco de Dados

## Scripts Disponíveis

### Banco de Teste (Automático)

- **reset-test-db.ts**: Executado automaticamente durante os testes (`pnpm test:unit`, `pnpm test:integration`)
- Só funciona quando `NODE_ENV=test`
- Reseta apenas o banco `omni_mvp_test`

### Banco de Desenvolvimento (Manual)

- **reset-dev-db.ts**: Reset manual do banco de desenvolvimento
- **Comando**: `pnpm db:reset:dev`
- **Requer confirmação explícita**: Digite "RESET-DEV-DB" para confirmar
- Só funciona no banco `omni_mvp` (desenvolvimento)

## Segurança

- O banco de desenvolvimento **NUNCA** é resetado automaticamente
- Reset do banco de desenvolvimento requer confirmação explícita
- Scripts validam qual banco estão afetando antes de executar

## Uso Recomendado

### Para desenvolvimento normal:

```bash
# Resetar banco de desenvolvimento (com confirmação)
pnpm db:reset:dev

# Popular com dados iniciais
pnpm db:seed
```

### Para testes:

```bash
# Executar testes (reseta banco de teste automaticamente)
pnpm test:unit
pnpm test:integration
```

## Precauções

- **NUNCA** execute `reset-dev-db.ts` sem backup dos dados importantes
- O reset do banco de desenvolvimento é **irreversível**
- Sempre confirme duas vezes antes de executar em produção
