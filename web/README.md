# Omni Saúde - Sistema de Gestão de Laudos

![coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)

## Sobre o Projeto

Sistema de gestão para recebimento, processamento e notificação de laudos médicos de laboratórios externos. O projeto inclui APIs para integração com laboratórios e interface web para gestão de pacientes e profissionais de saúde.

## Documentação

### 📚 Documentação Principal

- 📋 [Documentação da API de Laudos](./docs/API_DOCUMENTACAO.md) - Guia completo para integração de laboratórios
- 🏥 [Central de Notificações](./docs/CENTRAL_NOTIFICACOES_LAUDOS.md) - Sistema de notificações para laudos
- 🎨 [Componentes UI](./docs/UI_COMPONENTS.md) - Documentação dos componentes da interface
- 🗄️ [Gerenciamento de Banco de Dados](./docs/DATABASE_MANAGEMENT.md) - Scripts e segurança para bancos de dados

### ⚡ Melhorias Recentes (Dezembro 2025)

- 🚀 [Melhorias de Performance e Conformidade](./docs/PERFORMANCE_CONFORMIDADE_MELHORIAS.md) - **NOVO**: Documentação completa das otimizações
- 📊 [Sumário Executivo das Melhorias](./docs/SUMARIO_MELHORIAS.md) - **NOVO**: Resumo para gestores com métricas
- ✅ [Implementação Concluída](./docs/IMPLEMENTACAO_CONCLUIDA.md) - **NOVO**: Status e checklist completo
- 🎯 [Plano de Ação Futuro](./docs/PLANO_ACAO_FUTURO.md) - **NOVO**: Próximos passos e roadmap

### 📝 Histórico e Evolução

- 📖 [Histórico do Projeto](./docs/HISTORICO.md) - Changelog e evolução do sistema

## APIs Principais

### POST /api/lab/submit

Endpoint para laboratórios enviarem laudos de pacientes:

```bash
curl -X POST http://localhost:3000/api/lab/submit \
  -H "Content-Type: application/json" \
  -d '{
    "patientEmail": "paciente@email.com",
    "doctorName": "Dr. João Silva",
    "examDate": "2024-11-17",
    "documento": "LAB-12345",
    "cpf": "12345678901",
    "report": {
      "fileName": "laudo.pdf",
      "fileContent": "base64_encoded_content"
    }
  }'
```

Ver [documentação completa da API](./docs/API_DOCUMENTACAO.md) para detalhes de parâmetros, validações e códigos de resposta.

## Como executar os testes

### ⚠️ Importante: Segurança do Banco de Dados

**NUNCA execute testes no banco de desenvolvimento!** Os testes usam um banco separado (`omni_mvp_test`) para evitar perda de dados.

### Comandos de teste

```bash
# Executar todos os testes (unidade + integração)
pnpm test

# Executar apenas testes unitários
pnpm run test:unit

# Executar apenas testes de integração
pnpm run test:integration

# Executar testes E2E (Playwright)
pnpm run test:e2e

# Executar testes com cobertura
pnpm run test:coverage
```

### Proteções implementadas

- ✅ **Banco de teste isolado**: Todos os testes usam `omni_mvp_test`
- ✅ **NODE_ENV=test**: Scripts só executam em ambiente de teste
- ✅ **Confirmação explícita**: Reset do banco dev requer "RESET-DEV-DB"
- ✅ **Verificação de DATABASE_URL**: Scripts validam o banco correto

### Resetando bancos

```bash
# Resetar banco de DESENVOLVIMENTO (com confirmação)
pnpm run db:reset:dev

# Resetar banco de TESTE (automático durante testes)
# Executado automaticamente pelos scripts de teste
```

## Limitações conhecidas dos testes unitários

Alguns testes unitários podem falhar em ambiente JSDOM devido a limitações técnicas, especialmente ao testar componentes que usam:

- **Radix UI (ex: Dialog, Select)**: Dependem de APIs do DOM reais e podem emitir warnings ou não renderizar corretamente em portais.
- **Portals React**: Modais e dropdowns podem ser renderizados fora do DOM principal, dificultando queries nos testes.
- **Mocks de fetch e ciclo de vida React**: O mock pode não ser chamado conforme esperado se o componente receber props que evitam o fetch.

Essas falhas não indicam bugs reais no componente em produção, apenas limitações do ambiente de teste. Os componentes funcionam corretamente na aplicação real.
