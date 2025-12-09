# Guidelines de Qualidade e Prevenção de Regressões

## Visão Geral

Este documento estabelece as práticas e processos para manter a qualidade do código e prevenir regressões no sistema OmniSaúde.

## Pipeline CI/CD

### Estrutura Atual

- **CI Básico**: Executa testes unitários, E2E e linting em cada push/PR
- **Deploy Staging**: Deploy automático na branch `develop` com testes de smoke
- **Quality Gates**: Bloqueio de merges com cobertura abaixo de 75%

### Branches e Fluxo

```
main (produção)
├── develop (staging)
│   ├── feature/nome-da-feature
│   └── bugfix/nome-do-bug
```

## Testes

### Cobertura Mínima

- **Unitários**: 75% de cobertura de código
- **Componentes**: Testes para componentes críticos
- **E2E**: Funcionalidades principais cobertas
- **Integração**: Fluxos críticos testados

### Tipos de Testes

1. **Unitários**: Funções, hooks, utilitários
2. **Componentes**: Interações UI, validações
3. **Integração**: APIs, fluxos completos
4. **E2E**: Cenários reais de usuário
5. **Smoke**: Verificação pós-deploy

## Code Quality

### Linting e Formatação

- ESLint para qualidade de código
- Prettier para formatação consistente
- Husky para pre-commit hooks

### Code Reviews

- Revisão obrigatória para todos os PRs
- Foco em impacto de mudanças
- Verificação de testes adequados

## Monitoramento

### Métricas Principais

- Cobertura de testes
- Tempo de build
- Taxa de falhas nos testes
- Performance das APIs

### Alertas

- Falha no pipeline CI/CD
- Queda na cobertura de testes
- Erros em produção (Sentry)

## Prevenção de Regressões

### Checklist Pré-Merge

- [ ] Todos os testes passando
- [ ] Cobertura mantida ou aumentada
- [ ] Linting sem erros
- [ ] Code review aprovado
- [ ] Funcionalidades relacionadas testadas

### Estratégias

1. **Testes Automatizados**: Cobertura abrangente de funcionalidades críticas
2. **Feature Flags**: Deploy gradual de novas funcionalidades
3. **Rollbacks**: Capacidade de voltar versões rapidamente
4. **Monitoramento Contínuo**: Detecção precoce de problemas

## Desenvolvimento

### Padrões de Commit

```
feat: nova funcionalidade
fix: correção de bug
docs: atualização de documentação
test: adição ou correção de testes
refactor: refatoração de código
```

### Versionamento

- Semantic Versioning (MAJOR.MINOR.PATCH)
- Tags Git para releases
- Changelog automático

## Resolução de Problemas

### Testes Falhando

1. Verificar se mudança quebrou funcionalidade existente
2. Atualizar testes se comportamento mudou intencionalmente
3. Corrigir bug se foi introduzido acidentalmente

### Cobertura Baixa

1. Identificar código não testado
2. Adicionar testes unitários
3. Considerar refatoração para melhorar testabilidade

### Performance

1. Monitorar métricas de performance
2. Otimizar queries e componentes
3. Adicionar testes de performance

## Ferramentas

### Desenvolvimento

- VS Code com extensões de qualidade
- Pre-commit hooks com Husky
- Dependabot para atualizações de dependências

### CI/CD

- GitHub Actions
- PostgreSQL para testes
- Cache de dependências

### Monitoramento

- Sentry para erros
- Codecov para cobertura
- GitHub Insights para métricas

## Manutenção

### Revisão Periódica

- Mensal: Revisar cobertura e qualidade dos testes
- Trimestral: Atualizar dependências e ferramentas
- Semestral: Revisar processos e identificar melhorias

### Documentação

- Manter este documento atualizado
- Documentar decisões técnicas importantes
- Criar guias para novos desenvolvedores
