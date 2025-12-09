# Testes da Aplicação Web

Este documento descreve a estrutura e organização dos testes implementados para a aplicação web.

## 📚 Documentação Principal

### 🆕 Melhorias Recentes na Estratégia de Mocks

A estratégia de testes foi completamente modernizada seguindo as melhores práticas. **Comece aqui:**

- **[SUMARIO_EXECUTIVO.md](./SUMARIO_EXECUTIVO.md)** - Visão executiva das melhorias (⏱️ 5 min)
- **[MELHORIAS_MOCKS_README.md](./MELHORIAS_MOCKS_README.md)** - Visão técnica completa (⏱️ 10 min)
- **[GUIA_BOAS_PRATICAS_MOCKS.md](./GUIA_BOAS_PRATICAS_MOCKS.md)** - Guia de boas práticas (⏱️ 15 min)
- **[GUIA_MIGRACAO_TESTES.md](./GUIA_MIGRACAO_TESTES.md)** - Como migrar testes existentes (⏱️ 10 min)

### Exemplos Práticos

- **[unit/examples/refactored-test.example.test.ts](./unit/examples/refactored-test.example.test.ts)** - Exemplos comentados

### Scripts Úteis

```bash
# Validar configuração de mocks
pnpm ts-node tests/scripts/validate-mocks.ts

# Rodar testes
pnpm test              # Todos os testes
pnpm test:unit         # Apenas unitários
pnpm test:integration  # Apenas integração
pnpm test:e2e          # Apenas E2E
pnpm test:watch        # Watch mode
pnpm test:coverage     # Com coverage
```

---

## Estrutura de Testes

### Organização por Tipo

```
web/tests/
├── setup/                    # Configurações globais de teste
│   ├── performance-setup.ts  # Utilitários para testes de performance
│   ├── contract-setup.ts     # Utilitários para testes de contrato
│   ├── prisma-mock.ts        # Mocks do Prisma
│   └── vitest.setup.ts       # Setup principal do Vitest
├── unit/                     # Testes unitários
│   ├── components/           # Testes de componentes React
│   ├── services/             # Testes de serviços
│   │   ├── eventService.test.ts
│   │   ├── eventService.performance.test.ts
│   │   ├── professionalService.test.ts
│   │   ├── professionalService.performance.test.ts
│   │   └── api.contract.test.ts
│   └── ...
├── integration/              # Testes de integração
├── e2e/                      # Testes end-to-end
└── utils/                    # Utilitários de teste
    └── mocks/                # Dados e funções mockadas
```

## Tipos de Testes Implementados

### 1. Testes de Performance

**Objetivo**: Garantir que as operações críticas do banco de dados atendam aos requisitos de performance.

**Arquivos**:

- `eventService.performance.test.ts`
- `professionalService.performance.test.ts`

**Métricas Avaliadas**:

- Tempo de execução de operações CRUD
- Performance sob carga (operações concorrentes)
- Eficiência com grandes volumes de dados
- Impacto de operações complexas (ex: validação de sobreposição)

**Limites de Performance**:

- Create: ≤ 100ms
- Read: ≤ 50ms
- Update: ≤ 100ms
- Delete: ≤ 150ms
- Bulk operations: ≤ 300ms (100 operações)

### 2. Testes de Contrato de API

**Objetivo**: Validar que as APIs externas aderem aos contratos estabelecidos.

**Arquivo**: `api.contract.test.ts`

**Contratos Validados**:

- **Events API**: CRUD operations com validação de schema
- **Professionals API**: Listagem e criação
- **Notifications API**: Listagem e criação
- **External APIs**: Integração com laboratórios e upload

**Validações**:

- Status codes corretos
- Estrutura de resposta conforme contrato
- Campos obrigatórios presentes
- Tipos de dados corretos
- Tratamento de erros consistente

### 3. Testes Unitários Melhorados

**Melhorias Implementadas**:

- Migração para mocks completos do Prisma
- Uso consistente de `mockPrisma` em todos os testes
- Melhor isolamento de testes
- Cobertura mais abrangente de cenários

## Configuração de Testes

### Setup Files

1. **`performance-setup.ts`**: Utilitários para medição de performance

   - `PerformanceMonitor`: Classe para rastrear tempos de execução
   - Funções auxiliares para asserções de performance
   - Utilitários para criação de dados de teste em massa

2. **`contract-setup.ts`**: Utilitários para validação de contratos

   - `ContractValidator`: Classe para validar contratos de API
   - Contratos padrão pré-registrados
   - Funções para asserção de conformidade

3. **`prisma-mock.ts`**: Mocks completos do cliente Prisma
   - Implementação completa de todos os métodos necessários
   - Dados mockados consistentes
   - Suporte a relacionamentos

### Configuração do Vitest

```typescript
// vitest.config.ts
{
  test: {
    setupFiles: [
      "./src/test/setup.ts",
      "./src/test/setupFetchMock.ts",
      "./web/tests/setup/performance-setup.ts",
      "./web/tests/setup/contract-setup.ts",
    ];
  }
}
```

## Estratégia de Mocks

### Mocks do Prisma

**Antes**: Mocks parciais inline nos testes

```typescript
vi.mock("../../../src/lib/prisma", () => ({
  prisma: {
    healthEvent: {
      findMany: vi.fn(),
      create: vi.fn(),
      // ... apenas métodos usados
    },
  },
}));
```

**Depois**: Mock completo centralizado

```typescript
import { mockPrisma } from "../../setup/prisma-mock";

vi.mock("../../../src/lib/prisma", () => ({
  prisma: mockPrisma,
}));
```

**Benefícios**:

- Consistência entre testes
- Manutenção centralizada
- Melhor isolamento
- Suporte completo a todos os métodos

### Mocks de API Externas

**Setup Centralizado**: `setupFetchMock.ts`

- Mapeamento de rotas para respostas mockadas
- Suporte a parâmetros dinâmicos
- Funções utilitárias para adicionar/remover rotas

## Execução de Testes

### Comandos Disponíveis

```bash
# Todos os testes
npm test

# Apenas testes de performance
npm test -- --run "*performance*"

# Apenas testes de contrato
npm test -- --run "*contract*"

# Testes específicos
npm test -- --run "eventService.performance.test.ts"
```

### Relatórios de Performance

Os testes de performance geram relatórios detalhados:

```typescript
const report = performanceMonitor.generateReport();
// {
//   "createEvent": { avg: 45.2, min: 32.1, max: 78.9, count: 10 },
//   "getEvents": { avg: 23.4, min: 18.7, max: 34.2, count: 15 }
// }
```

### Relatórios de Contrato

Os testes de contrato validam conformidade:

```typescript
const results = await contractValidator.validateAllContracts();
// [
//   { endpoint: '/api/events', method: 'GET', passed: true, errors: [] },
//   { endpoint: '/api/events', method: 'POST', passed: false, errors: [...] }
// ]
```

## Boas Práticas Implementadas

### 1. Isolamento de Testes

- Cada teste é independente
- Mocks limpos entre testes
- Setup/teardown apropriado

### 2. Dados de Teste Consistentes

- Dados mockados centralizados em `mockData.ts`
- Fábricas para geração de dados em massa
- Relacionamentos mantidos

### 3. Cobertura Abrangente

- Cenários positivos e negativos
- Casos extremos (performance)
- Validação de contratos
- Tratamento de erros

### 4. Manutenibilidade

- Código DRY (Don't Repeat Yourself)
- Configurações centralizadas
- Documentação clara

## Próximos Passos

1. **Expandir Cobertura**: Adicionar testes de performance para outros serviços
2. **Monitoramento Contínuo**: Integrar com CI/CD para alertas de performance
3. **Testes de Carga**: Implementar testes com ferramentas especializadas
4. **Contratos Automatizados**: Gerar documentação de API a partir dos contratos
5. **Testes de Regressão Visual**: Para componentes críticos

## Troubleshooting

### Problemas Comuns

1. **Erros de Tipo no Prisma**: Verificar se `mockPrisma` está atualizado
2. **Performance Instável**: Usar `vi.useFakeTimers()` para consistência
3. **Mocks Não Isolados**: Garantir `vi.clearAllMocks()` em `beforeEach`

### Debug

```typescript
// Verificar estado dos mocks
console.log(prisma.healthEvent.findMany.mock.calls);

// Verificar medições de performance
console.log(performanceMonitor.generateReport());

// Verificar validações de contrato
console.log(contractValidator.getValidationResults());
```
