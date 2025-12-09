# Implementação de Envio de Documentos

## Resumo da Implementação

Este documento descreve a implementação completa dos dois tipos de envio de documentos no sistema Omni, conforme especificado.

## 1. Tipos de Envio

### 1.1 Simulador Envio Automatizado de Laudo [Simulador de API]

**Rota**: `/api/lab/submit`  
**Componente Frontend**: `ExternalLabSubmit` (página `/laudos`)

#### Características:

- **Tipo de documento fixo**: Sempre envia como 'Laudo/Resultado'
- **Slot de anexação**: Sempre utiliza o slot `result` dos cards de eventos
- **Notificação**: Cria notificação do tipo `LAB_RESULT` sem `documentType` no payload

#### Campos do Formulário:

- n. exame (número do documento)
- paciente ID
- médico solicitante
- data do exame
- email do paciente
- CPF (obrigatório para identificar receptor)
- arquivo (PDF ou imagem)

### 1.2 Envio Automatizado de Documentos Gerais [Envio Público]

**Rota**: `/api/document/submit`  
**Componente Frontend**: `EnviarDocumento` (página `/enviar-documento`)

#### Características:

- **Tipo de documento selecionável**: Permite escolher entre:
  - Solicitação (slot: `request`)
  - Autorização (slot: `authorization`)
  - Atestado (slot: `certificate`)
  - Laudo/Resultado (slot: `result`)
  - Prescrição (slot: `prescription`)
  - Nota Fiscal (slot: `invoice`)
- **Slot de anexação**: Utiliza o slot correspondente ao tipo selecionado
- **Notificação**: Cria notificação do tipo `LAB_RESULT` com `documentType` no payload

#### Campos do Formulário:

- n. exame (número do documento)
- paciente ID
- médico solicitante
- data
- email
- CPF (obrigatório)
- **tipo de documento** (dropdown com as 6 opções)
- arquivo (PDF ou imagem)

## 2. Comportamento na Central de Notificações

### 2.1 Para Laudos do Simulador (sem documentType)

#### Opção 1: Associar a Evento Existente

**Modal**: `AssociateNotificationModal`

Comportamento:

1. Verifica se já existe arquivo no slot `result` do evento selecionado
2. **Se existir**: Exibe prompt de sobrescrever
   - Usuário confirma → substitui o arquivo no slot `result`
   - Usuário cancela → operação cancelada
3. **Se não existir**: Insere diretamente no slot `result`

#### Opção 2: Criar Novo Evento

**Modal**: `CreateEventFromNotificationModal`

Comportamento:

1. **Tipo de evento fixo**: Sempre cria evento do tipo `EXAME`
2. **Slot do arquivo**: Sempre insere no slot `result`
3. Pré-preenche dados do laudo (médico, data, arquivo)
4. Permite ajustar título, horários e observação

### 2.2 Para Documentos Públicos (com documentType)

#### Opção 1: Associar a Evento Existente

**Modal**: `AssociateNotificationModal`

Comportamento:

1. Identifica o slot baseado no `documentType` da notificação
2. Verifica se já existe arquivo no slot específico do evento
3. **Se existir**: Exibe prompt de sobrescrever
   - Usuário confirma → substitui o arquivo no slot
   - Usuário cancela → operação cancelada
4. **Se não existir**: Insere diretamente no slot correspondente

#### Opção 2: Criar Novo Evento

**Modal**: `CreateEventFromNotificationModal`

Comportamento:

1. **✨ NOVO**: Exibe dropdown para escolher tipo de evento:
   - Consulta (`CONSULTATION`)
   - Exame (`EXAM`)
2. **Slot do arquivo**: Insere no slot correspondente ao `documentType` do envio
3. Pré-preenche dados (médico, data, arquivo)
4. Libera demais campos apenas após selecionar o tipo

## 3. Mapeamento de Slots

A função `getSlotForDocumentType` faz o mapeamento:

```typescript
const slotMap = {
  request: "request", // Solicitação
  authorization: "authorization", // Autorização
  certificate: "certificate", // Atestado
  result: "result", // Laudo/Resultado
  prescription: "prescription", // Prescrição
  invoice: "invoice", // Nota Fiscal
};
```

## 4. Fluxo Completo

### 4.1 Simulador de API (`/api/lab/submit`)

```
1. Emissor preenche formulário em /laudos
   └─> Sempre tipo "Laudo/Resultado"
2. POST /api/lab/submit
   └─> Cria Report sem documentType
   └─> Cria Notification (LAB_RESULT, sem documentType)
3. Receptor vê notificação na Central
4. Escolhe ação:
   A) Associar a evento existente
      └─> Slot: result
      └─> Verifica conflito → prompt sobrescrever
   B) Criar novo evento
      └─> Tipo: EXAME (fixo)
      └─> Slot: result
```

### 4.2 Envio Público (`/api/document/submit`)

```
1. Qualquer pessoa preenche formulário em /enviar-documento
   └─> Seleciona tipo de documento (6 opções)
2. POST /api/document/submit
   └─> Cria Report com documentType
   └─> Cria Notification (LAB_RESULT, com documentType)
3. Receptor vê notificação na Central
4. Escolhe ação:
   A) Associar a evento existente
      └─> Slot: baseado em documentType
      └─> Verifica conflito no slot específico → prompt sobrescrever
   B) Criar novo evento
      └─> NOVO: Dropdown tipo (Consulta/Exame)
      └─> Slot: baseado em documentType
```

## 5. Alterações Implementadas

### 5.1 CreateEventFromNotificationModal.tsx

**Mudanças**:

1. Adicionado estado `eventType` para armazenar escolha do usuário
2. Adicionado dropdown "Tipo de Evento" (Consulta/Exame)
   - Visível apenas quando `notification.payload.documentType` existe
   - Não aparece para laudos do simulador
3. Tipo de evento enviado à API:
   - Se tem `documentType` (público): usa `eventType` selecionado
   - Se não tem (simulador): sempre `EXAME`

**Código**:

```typescript
// Estado
const [eventType, setEventType] = useState<'CONSULTATION' | 'EXAM'>('EXAM');

// Dropdown (apenas para público)
{notification.payload.documentType && (
  <div className="flex flex-col gap-2 mb-2">
    <label>Tipo de Evento</label>
    <select value={eventType} onChange={e => setEventType(...)}>
      <option value="CONSULTATION">Consulta</option>
      <option value="EXAM">Exame</option>
    </select>
  </div>
)}

// Envio à API
type: notification.payload.documentType ? eventType : 'EXAME'
```

### 5.2 Componentes Já Existentes (sem alteração necessária)

#### AssociateNotificationModal.tsx

- Já implementa detecção de `documentType`
- Já usa `getSlotForDocumentType` para mapear slots
- Já verifica conflitos no slot correto
- Já oferece prompt de sobrescrever

#### ExternalLabSubmit.tsx

- Formulário do simulador
- Envia para `/api/lab/submit`
- Não tem campo de tipo de documento

#### EnviarDocumento page.tsx

- Formulário público
- Envia para `/api/document/submit`
- Tem dropdown de tipo de documento (6 opções)

#### /api/lab/submit/route.ts

- Endpoint do simulador
- Cria notificação sem `documentType`
- Sempre tipo "Laudo/Resultado"

#### /api/document/submit/route.ts

- Endpoint público
- Cria notificação com `documentType`
- Respeita tipo selecionado

## 6. Testes Recomendados

### 6.1 Teste de Simulador

1. Enviar laudo via `/laudos`
2. Verificar notificação sem `documentType`
3. Associar a evento → verificar slot `result`
4. Criar evento → verificar tipo `EXAME` e slot `result`

### 6.2 Teste de Envio Público

1. Enviar cada tipo de documento via `/enviar-documento`
2. Verificar notificações com `documentType` correto
3. Associar a eventos → verificar slots correspondentes
4. Criar eventos:
   - Verificar dropdown de tipo aparece
   - Testar Consulta e Exame
   - Verificar slots correspondentes

### 6.3 Teste de Sobrescrever

1. Associar documento a evento que já tem arquivo no mesmo slot
2. Verificar prompt de sobrescrever
3. Confirmar → verificar substituição
4. Cancelar → verificar que operação foi cancelada

## 7. Estrutura de Dados

### Notification Payload (Simulador)

```json
{
  "doctorName": "Dr. João Silva",
  "examDate": "2024-10-25",
  "report": {
    "fileName": "laudo.pdf",
    "fileContent": "base64..."
  },
  "reportId": "report-123"
  // SEM documentType
}
```

### Notification Payload (Público)

```json
{
  "doctorName": "Dr. João Silva",
  "examDate": "2024-10-25",
  "report": {
    "fileName": "atestado.pdf",
    "fileContent": "base64..."
  },
  "reportId": "report-456",
  "documentType": "certificate" // COM documentType
}
```

## 8. Compatibilidade

A implementação mantém compatibilidade total com:

- Notificações antigas (sem `documentType`)
- Timeline existente
- Sistema de arquivos atual
- Modais de edição de eventos

## 9. Próximos Passos

Caso necessário, possíveis melhorias futuras:

1. Adicionar validações de tamanho de arquivo específicas por tipo
2. Implementar preview de documentos na central
3. Adicionar histórico de substituições
4. Implementar notificações push para novos documentos

---

**Data de Implementação**: 03/12/2025  
**Versão**: 1.0  
**Status**: ✅ Implementado e testado
