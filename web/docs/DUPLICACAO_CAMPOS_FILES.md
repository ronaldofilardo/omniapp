# Dívida Técnica: Duplicação de Campos `url` e `physicalPath` na Tabela `files`

## Problema Identificado

A tabela `files` no banco de dados apresenta duplicação conceitual entre os campos:

- `url` (String): Caminho público para acesso ao arquivo
- `physicalPath` (String): Caminho absoluto no sistema de arquivos local

Essa configuração foi criada para lidar com diferenças entre ambientes de desenvolvimento e produção, mas introduz complexidade desnecessária.

## Contexto Técnico

### Ambiente de Desenvolvimento

- **Deploy**: Local (Next.js dev server)
- **Armazenamento**: Sistema de arquivos local
- **Campo usado**: `physicalPath`
- **Razão**: Facilita desenvolvimento e testes sem dependência de serviços externos

### Ambiente de Produção

- **Deploy**: Vercel (conta gratuita)
- **Armazenamento**: Serviços em nuvem (Cloudinary)
- **Campo usado**: `url`
- **Razão**: Vercel não oferece armazenamento persistente de arquivos

## Solução Implementada

### Função Utilitária

Criada `src/lib/utils/filePath.ts` com funções para:

- `getFilePath(file)`: Retorna caminho apropriado baseado no ambiente
- `validateFileRecord(file)`: Valida se registro tem campos necessários
- `supportsLocalStorage()`: Verifica suporte a armazenamento local

### Uso Recomendado

```typescript
import { getFilePath, validateFileRecord } from "@/lib/utils/filePath";

// Em qualquer lugar que precisar acessar arquivo
const filePath = getFilePath(fileRecord);
```

## Migração para Cloudinary

### Etapas

1. **Integração Cloudinary**: Implementar upload/download via Cloudinary API
2. **Atualização de Schema**: Remover campo `physicalPath` (breaking change)
3. **Migração de Dados**: Migrar arquivos existentes para Cloudinary e atualizar URLs
4. **Remoção de Lógica Condicional**: Simplificar código para usar apenas `url`

### Benefícios Esperados

- Eliminação da duplicação de campos
- Arquitetura mais limpa e consistente
- Melhor escalabilidade
- Redução de complexidade no código

### Riscos

- **Breaking Change**: Requer migração cuidadosa de dados existentes
- **Downtime**: Possível indisponibilidade durante migração
- **Testes**: Necessário testar thoroughly em ambos ambientes

## Status Atual

- ✅ Função utilitária criada para abstrair lógica (`src/lib/utils/filePath.ts`)
- ✅ Validações implementadas e corrigidas
- ✅ Provider Cloudinary implementado (`src/lib/storage/CloudinaryStorageProvider.ts`)
- ✅ Integração no sistema (`src/lib/storage/index.ts`)
- ✅ Configuração de credenciais Cloudinary concluída
- ✅ Testes implementados

## Recomendações

1. **Imediato**: Usar `getFilePath()` em todo novo código que acessar arquivos
2. **Próximo**: Migrar schema e remover `physicalPath` após estabilização
3. **Futuro**: Otimizar uso do Cloudinary conforme necessidades

## Responsáveis

- Desenvolvimento: Equipe de backend/frontend
- Infraestrutura: Configuração Cloudinary
- QA: Testes de migração e compatibilidade
