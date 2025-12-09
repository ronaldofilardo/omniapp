# Padronização de Limites de Upload - 2MB

## Resumo das Alterações

Foi realizada a padronização do limite de tamanho de arquivo para **2MB em todo o sistema**, garantindo consistência entre todas as validações de upload.

## Problema Identificado

Anteriormente, o sistema tinha limites inconsistentes:

- Nota fiscal: **1MB** ❌
- Certificado: **1MB** ❌
- Prescrição: **500KB** ❌
- Laudo/Resultado: **2MB** ✓
- Solicitação/Autorização: **2MB** ✓
- Upload geral: **2MB** ✓

Isso causava a seguinte inconsistência:

- Um arquivo de 1.9MB era **aceito** em `/laudos` e `/enviar-documento`
- O mesmo arquivo era **rejeitado** ao associar em eventos (slots de certificado/nota fiscal)

## Solução Implementada

### 1. Atualização de Constantes

Arquivo: `src/lib/constants/fileLimits.ts`

Todos os limites foram padronizados para **2MB**:

```typescript
export const FILE_SIZE_LIMITS = {
  MAX_RESULT_FILE_SIZE: 2 * 1024 * 1024, // 2MB ✓
  MAX_CERTIFICATE_FILE_SIZE: 2 * 1024 * 1024, // 2MB ✓ (era 1MB)
  MAX_PRESCRIPTION_FILE_SIZE: 2 * 1024 * 1024, // 2MB ✓ (era 500KB)
  MAX_REQUEST_FILE_SIZE: 2 * 1024 * 1024, // 2MB ✓
  MAX_INVOICE_FILE_SIZE: 2 * 1024 * 1024, // 2MB ✓ (era 1MB)
  MAX_GENERAL_UPLOAD_SIZE: 2 * 1024 * 1024, // 2MB ✓
};
```

### 2. Locais Validados

A validação de 2MB agora é aplicada consistentemente em:

#### Upload de Arquivos

- ✅ `/api/upload` - Upload geral
- ✅ `/api/upload-file` - Upload de arquivos específicos
- ✅ `/api/laudos/upload` - Upload de laudos
- ✅ `/api/document/submit` - Submissão de documentos (2MB já estava correto)

#### Associação em Eventos

- ✅ `AssociateNotificationModal` - Associação de notificações a eventos
- ✅ `EventCard` - Anexação direta em eventos
- ✅ `RepositoryTab` - Upload no repositório
- ✅ `FileSlotRepository` - Upload em slots de arquivo

#### Validações de Slots

Todos os slots de arquivo agora aceitam até 2MB:

- ✅ `result` (laudo/resultado)
- ✅ `certificate` (certificado/atestado)
- ✅ `prescription` (prescrição médica)
- ✅ `request` (solicitação)
- ✅ `authorization` (autorização)
- ✅ `invoice` (nota fiscal)

### 3. Testes Criados e Atualizados

#### Novo Arquivo de Testes

`tests/unit/lib/file-size-limits.test.ts` - **17 testes criados**

Categorias de teste:

1. **Validação de Constantes** (4 testes)

   - Verificar que todos os limites são 2MB
   - Consistência entre FILE_SIZE_LIMITS e SLOT_FILE_LIMITS

2. **Formatação de Tamanho** (3 testes)

   - Formatação correta de bytes para KB/MB
   - Teste específico para 2MB

3. **Mensagens de Erro** (4 testes)

   - Geração correta de mensagens para cada tipo de slot
   - Verificação de valores nos erros (limite e tamanho atual)

4. **Validação de Limites** (4 testes)

   - Aceitar arquivo exatamente de 2MB
   - Rejeitar arquivo de 2MB + 1 byte
   - Aceitar arquivo de 1.9MB
   - Rejeitar arquivo de 3MB

5. **Compatibilidade com Uploads Anteriores** (2 testes)
   - Garantir que arquivos enviados em `/laudos` e `/enviar-documento` sejam válidos para todos os slots
   - Verificar consistência do limite geral com limites de slots

#### Testes de Integração Atualizados

**`tests/integration/file-attachment-and-view.test.tsx`** - 15 testes passando

- Atualizada expectativa de limites para 2MB
- Atualizado teste de certificado para usar 3MB (ao invés de 2MB) como arquivo grande

**`tests/integration/file-upload-workflow.test.tsx`** - 10 testes passando

- Atualizada validação de arquivo grande para 2MB + 1000 bytes
- Mensagem de erro atualizada para "máximo 2MB"

### 4. Resultados dos Testes

#### Testes Unitários

```
✓ tests/unit/lib/file-size-limits.test.ts (17 testes)
  ✓ FILE_SIZE_LIMITS (2 testes)
  ✓ SLOT_FILE_LIMITS (2 testes)
  ✓ formatFileSize (3 testes)
  ✓ getFileTooLargeError (4 testes)
  ✓ Validação de arquivos com 2MB (4 testes)
  ✓ Compatibilidade com uploads anteriores (2 testes)
```

#### Testes de Integração

```
✓ tests/integration/file-attachment-and-view.test.tsx (15 testes)
✓ tests/integration/file-upload-workflow.test.tsx (10 testes)
```

**Total: 42 testes passando ✅**

## Benefícios da Padronização

### 1. Consistência

- ✅ Mesmo limite em toda a aplicação
- ✅ Não há mais rejeição de arquivos previamente aceitos
- ✅ Experiência do usuário unificada

### 2. Compatibilidade com Vercel

- ✅ 2MB está dentro do limite de 4.5MB do Vercel Free
- ✅ Margem segura para metadados e encoding base64

### 3. Manutenibilidade

- ✅ Constantes centralizadas em `fileLimits.ts`
- ✅ Fácil atualização futura se necessário
- ✅ Testes garantem integridade das mudanças

### 4. Segurança

- ✅ Validação em múltiplas camadas (frontend + backend)
- ✅ Mensagens de erro claras e informativas
- ✅ Auditoria de tentativas de upload grandes

## Arquivos Modificados

### Constantes

- ✅ `src/lib/constants/fileLimits.ts` - Padronização para 2MB

### Testes

- ✅ `tests/unit/lib/file-size-limits.test.ts` - **NOVO** (17 testes)
- ✅ `tests/integration/file-attachment-and-view.test.tsx` - Atualizado
- ✅ `tests/integration/file-upload-workflow.test.tsx` - Atualizado

## Casos de Uso Validados

### ✅ Cenário 1: Upload em /laudos

```
Usuário envia laudo de 1.9MB
→ Aceito no /laudos
→ Aceito ao associar em qualquer slot de evento
```

### ✅ Cenário 2: Upload em /enviar-documento

```
Usuário envia documento de 1.9MB
→ Aceito no /enviar-documento
→ Aceito ao associar em qualquer slot de evento
```

### ✅ Cenário 3: Associação direta em evento

```
Usuário anexa arquivo de 1.9MB diretamente no evento
→ Aceito em todos os slots (result, certificate, prescription, etc.)
```

### ❌ Cenário 4: Arquivo muito grande

```
Usuário tenta enviar arquivo de 2.1MB
→ Rejeitado com mensagem clara:
   "Arquivo de [tipo] deve ter menos de 2.0MB. Tamanho atual: 2.1MB"
```

## Compatibilidade com Versões Anteriores

✅ Arquivos já enviados com menos de 2MB continuam válidos
✅ Nenhuma migração de dados necessária
✅ APIs mantêm comportamento esperado

## Monitoramento e Métricas

A padronização para 2MB permite:

- Melhor controle de custos de armazenamento
- Análise consistente de tentativas de upload
- Logs de auditoria padronizados

## Conclusão

A padronização para 2MB resolve completamente o problema de inconsistência de limites, garantindo que:

1. Arquivos aceitos em um lugar não sejam rejeitados em outro
2. Todos os slots de eventos tenham o mesmo limite
3. O sistema seja mais fácil de manter e evoluir

**Status: ✅ Implementação completa e testada**
