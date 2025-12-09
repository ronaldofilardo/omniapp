# Testes Manuais

Esta pasta contém scripts de teste manual que são usados para testar funcionalidades específicas ou fluxos completos que não são adequados para testes automatizados.

## Scripts Disponíveis

- `test-complete-orphan.js` - Testa o fluxo completo de arquivos órfãos
- `test-db.js` - Script para testes de banco de dados
- `test-results.json` - Resultados de testes manuais

## Como Usar

Estes scripts devem ser executados manualmente quando necessário:

```bash
node web/tests/manual/test-complete-orphan.js
```

**Nota:** Estes scripts fazem alterações reais no banco de dados e devem ser usados com cuidado em ambientes de produção.
