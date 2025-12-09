# Correções de Arquitetura - Configurações e Error Handling

## Resumo das Implementações

Este documento detalha as correções de arquitetura implementadas para resolver problemas críticos identificados na aplicação.

## 1. Centralização de Limites de Arquivo ✅

### Problema

- Limite inconsistente: 2MB em upload.ts vs 100MB no Cloudinary provider
- Risco de rejeição inesperada ou aceitação de arquivos muito grandes
- Custos excessivos de storage com arquivos grandes

### Solução Implementada

- **Limite unificado**: 2MB para TODOS os uploads (imagens e PDFs)
- Centralizado em `src/lib/constants/fileLimits.ts`
- Aplicado em todos os providers de storage

### Arquivos Modificados

- `src/lib/storage/config.ts`: Atualizado para 2MB em todos ambientes
- `src/lib/storage/CloudinaryStorageProvider.ts`:
  - `getMaxFileSize()` retorna 2MB
  - `supportsLargeFiles()` retorna `false`
- `tests/unit/storage/CloudinaryStorageProvider.test.ts`: Testes atualizados

### Configuração Central

```typescript
// src/lib/config/app.config.ts
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 2 * 1024 * 1024, // 2MB
  ALLOWED_MIME_TYPES: [...],
  UPLOAD_TIMEOUT: 30000,
  ALLOW_LARGE_FILES: false,
} as const;
```

## 2. Error Boundaries Padronizados ✅

### Problema

- Tratamento de erros inconsistente nos componentes
- Erros não tratados podem quebrar a UX completamente
- Falta de feedback adequado ao usuário

### Solução Implementada

- Error Boundary base reutilizável
- Wrappers especializados para diferentes contextos
- Feedback visual consistente e informativo

### Componentes Criados

#### ErrorBoundary (Base)

```typescript
// src/components/ErrorBoundary.tsx
<ErrorBoundary fallback={<ErrorMessage />}>
  <ComponenteQuePodemFalhar />
</ErrorBoundary>
```

#### Wrappers Especializados

```typescript
// src/components/ErrorBoundaryWrappers.tsx

// 1. Para páginas inteiras
<PageErrorBoundary pageName="Dashboard">
  <PageContent />
</PageErrorBoundary>

// 2. Para formulários
<FormErrorBoundary>
  <FormularioComplexo />
</FormErrorBoundary>

// 3. Para uploads
<UploadErrorBoundary>
  <ComponenteUpload />
</UploadErrorBoundary>

// 4. Para listas/tabelas
<ListErrorBoundary>
  <TabelaDados />
</ListErrorBoundary>
```

### Funcionalidades

- ✅ Captura erros durante rendering
- ✅ Fallback customizável por contexto
- ✅ Logs estruturados para debugging
- ✅ Detalhes de erro em desenvolvimento
- ✅ UI amigável em produção
- ✅ Botões de recuperação (voltar/recarregar)

### Hook Auxiliar

```typescript
const throwError = useErrorHandler();

// Usar para erros em eventos/promises
throwError(new Error("Algo deu errado"));
```

## 3. Fallback de Autenticação ✅

### Problema

- Endpoint `/api/notifications` dependia diretamente de `auth()`
- Falha em auth() quebrava funcionalidade crítica
- Sem tratamento de erro adequado

### Solução Implementada

- Try-catch em torno de `auth()`
- Resposta estruturada com array vazio em caso de erro
- Logs detalhados para debugging

### Código Implementado

```typescript
// src/app/api/notifications/route.ts
export async function GET(req: NextRequest) {
  let user;
  try {
    user = await auth();
  } catch (error) {
    console.error("[GET /api/notifications] Erro na autenticação:", error);
    return NextResponse.json(
      { error: "Falha na autenticação", notifications: [] },
      { status: 401 }
    );
  }

  if (!user) {
    return NextResponse.json(
      { error: "Não autorizado", notifications: [] },
      { status: 401 }
    );
  }

  // ... resto do código
}
```

### Benefícios

- ✅ Não quebra o fluxo de notificações
- ✅ Resposta consistente (sempre retorna array)
- ✅ Logs para investigação de problemas
- ✅ Graceful degradation

## 4. Configurações Centralizadas ✅

### Problema

- Constantes duplicadas em múltiplos arquivos
- Dificuldade de manutenção
- Risco de inconsistências

### Solução Implementada

- Arquivo único de configuração: `src/lib/config/app.config.ts`
- Todas as constantes da aplicação em um só lugar
- Imports consistentes de configuração

### Estrutura da Configuração

```typescript
// src/lib/config/app.config.ts
export const APP_CONFIG = {
  upload: {
    MAX_FILE_SIZE: 2 * 1024 * 1024,
    ALLOWED_MIME_TYPES: [...],
    UPLOAD_TIMEOUT: 30000,
    ALLOW_LARGE_FILES: false,
  },

  auth: {
    AUTH_TIMEOUT: 10000,
    SESSION_EXPIRY: 7 * 24 * 60 * 60,
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000,
  },

  api: {
    DEFAULT_TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    RATE_LIMIT: 60,
  },

  notification: {
    TOAST_DURATION: 5000,
    MAX_NOTIFICATIONS: 5,
    REFRESH_INTERVAL: 30000,
    ENABLE_SOUND: false,
  },

  pagination: {
    DEFAULT_PAGE_SIZE: 10,
    PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
    MAX_PAGE_SIZE: 100,
  },

  cache: {
    DEFAULT_TTL: 5 * 60 * 1000,
    STATIC_TTL: 60 * 60 * 1000,
    DYNAMIC_TTL: 60 * 1000,
  },

  validation: {
    MIN_PASSWORD_LENGTH: 8,
    MAX_PASSWORD_LENGTH: 128,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE_REGEX: /^\(?[1-9]{2}\)?\s?9?\d{4}-?\d{4}$/,
    CPF_REGEX: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
    CNPJ_REGEX: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
  },

  ui: {
    SEARCH_DEBOUNCE: 300,
    ANIMATION_DURATION: 200,
    TOOLTIP_DELAY: 500,
    MAX_CONTENT_WIDTH: 1280,
  },

  storage: {
    DEVELOPMENT_PROVIDER: 'local',
    PRODUCTION_PROVIDER: 'cloudinary',
    TEST_PROVIDER: 'local',
    STORAGE_TIMEOUT: 30000,
  },

  env: {
    IS_PRODUCTION: process.env.NODE_ENV === 'production',
    IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
    IS_TEST: process.env.NODE_ENV === 'test',
    IS_CLIENT: typeof window !== 'undefined',
    IS_SERVER: typeof window === 'undefined',
  },

  log: {
    VERBOSE_LOGS: ENV_CONFIG.IS_DEVELOPMENT,
    PERFORMANCE_LOGS: ENV_CONFIG.IS_DEVELOPMENT,
    ERROR_LOGS: true,
    API_LOGS: ENV_CONFIG.IS_DEVELOPMENT,
  },
};
```

### Como Usar

```typescript
// Sempre importar de app.config.ts
import { APP_CONFIG } from "@/lib/config/app.config";

// Usar as constantes
const maxSize = APP_CONFIG.upload.MAX_FILE_SIZE;
const timeout = APP_CONFIG.api.DEFAULT_TIMEOUT;
const pageSize = APP_CONFIG.pagination.DEFAULT_PAGE_SIZE;
```

### Benefícios

- ✅ Single source of truth
- ✅ Fácil de encontrar e modificar
- ✅ Type-safe com TypeScript
- ✅ Evita valores mágicos
- ✅ Documentação inline
- ✅ Manutenção simplificada

## Migração de Código Existente

### Antes

```typescript
// Valores hardcoded espalhados
const maxSize = 2 * 1024 * 1024;
const timeout = 30000;
const pageSize = 10;
```

### Depois

```typescript
import { APP_CONFIG } from "@/lib/config/app.config";

const maxSize = APP_CONFIG.upload.MAX_FILE_SIZE;
const timeout = APP_CONFIG.api.DEFAULT_TIMEOUT;
const pageSize = APP_CONFIG.pagination.DEFAULT_PAGE_SIZE;
```

## Próximos Passos Recomendados

### 1. Aplicar Error Boundaries

- [ ] Envolver páginas principais com `PageErrorBoundary`
- [ ] Adicionar `FormErrorBoundary` em todos os formulários
- [ ] Usar `UploadErrorBoundary` nos componentes de upload
- [ ] Aplicar `ListErrorBoundary` em tabelas e listas

### 2. Migrar Configurações

- [ ] Buscar valores hardcoded no código
- [ ] Substituir por imports de `APP_CONFIG`
- [ ] Remover constantes duplicadas

### 3. Testes

- [ ] Executar suite de testes para validar mudanças
- [ ] Atualizar testes que dependiam de valores antigos
- [ ] Adicionar testes para Error Boundaries

### 4. Monitoramento

- [ ] Integrar Error Boundaries com Sentry/LogRocket
- [ ] Configurar alertas para erros de autenticação
- [ ] Monitorar uploads rejeitados por tamanho

## Validação

Execute os testes para validar as mudanças:

```bash
# Suite completa
pnpm test

# Testes específicos de storage
pnpm vitest tests/unit/storage/

# Testes de configuração
pnpm vitest tests/unit/lib/upload-config.test.ts
```

## Impacto nas Métricas

### Redução de Custos

- ✅ Limite de 2MB previne uploads excessivos
- ✅ Menor uso de storage no Cloudinary
- ✅ Menor bandwidth de transferência

### Melhoria de UX

- ✅ Erros não quebram toda a aplicação
- ✅ Feedback visual consistente
- ✅ Possibilidade de recuperação sem perder contexto

### Manutenibilidade

- ✅ Configurações em um único lugar
- ✅ Menos código duplicado
- ✅ Mais fácil de testar e documentar

## Autores e Data

**Implementado em**: 5 de dezembro de 2025  
**Versão**: 1.0.0  
**Status**: ✅ Completo
