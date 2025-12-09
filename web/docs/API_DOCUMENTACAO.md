# API de Recebimento de Documentos/Laudos - Omni Saúde

## Visão Geral

Esta API permite que laboratórios externos enviem laudos e documentos médicos para pacientes cadastrados no sistema Omni Saúde. O sistema processa os documentos e gera notificações automáticas para os pacientes.

## Endpoint Principal

### POST /api/lab/submit

Submete um laudo médico para um paciente.

**URL:** `https://omni.com.br/api/lab/submit`

**Método:** `POST`

**Content-Type:** `application/json`

**Rate Limit:** 10 requisições por IP por hora

## Parâmetros de Entrada

### Body (JSON)

```json
{
  "patientEmail": "paciente@email.com",
  "doctorName": "Dr. João Silva",
  "examDate": "2024-10-25",
  "documento": "LAB-12345",
  "cpf": "12345678901",
  "report": {
    "fileName": "laudo.pdf",
    "fileContent": "base64_encoded_file_content"
  }
}
```

### Descrição dos Campos

| Campo                | Tipo   | Obrigatório | Descrição                                           |
| -------------------- | ------ | ----------- | --------------------------------------------------- |
| `patientEmail`       | string | ✅          | E-mail do paciente no sistema                       |
| `doctorName`         | string | ✅          | Nome do médico solicitante                          |
| `examDate`           | string | ✅          | Data do exame (formato: YYYY-MM-DD)                 |
| `documento`          | string | ✅          | Número do protocolo/documento do laboratório        |
| `cpf`                | string | ✅          | CPF do paciente (11 dígitos, com ou sem formatação) |
| `cnpj`               | string | ❌          | CNPJ (alternativa ao CPF para pessoa jurídica)      |
| `report.fileName`    | string | ✅          | Nome do arquivo do laudo                            |
| `report.fileContent` | string | ✅          | Conteúdo do arquivo em Base64                       |

### Validações

- **CPF**: Deve conter exatamente 11 dígitos numéricos
- **Arquivo**: Máximo 2KB após codificação Base64
- **Rate Limit**: Máximo 10 requisições por IP por hora
- **Identificação**: Obrigatório informar CPF ou CNPJ

## Respostas

### Sucesso (202 Accepted)

```json
{
  "notificationId": "notif-abc123",
  "reportId": "report-xyz789",
  "receivedAt": "2024-10-25T10:30:00.000Z"
}
```

| Campo            | Descrição                      |
| ---------------- | ------------------------------ |
| `notificationId` | ID único da notificação criada |
| `reportId`       | ID único do laudo no sistema   |
| `receivedAt`     | Timestamp de recebimento       |

### Erros

#### 400 - Bad Request

**JSON inválido:**

```json
{
  "error": "Invalid JSON"
}
```

**Campos obrigatórios faltando:**

```json
{
  "error": "Missing required fields"
}
```

**CPF inválido:**

```json
{
  "error": "Invalid CPF format"
}
```

**Arquivo muito grande:**

```json
{
  "error": "Report file too large (max 2KB)"
}
```

**CPF ou CNPJ obrigatório:**

```json
{
  "error": "Either CPF or CNPJ is required"
}
```

#### 404 - Not Found

**Paciente não encontrado:**

```json
{
  "error": "User not found by CPF",
  "searched": {
    "cpf": "12345678901",
    "clean": "12345678901"
  }
}
```

#### 429 - Rate Limit Exceeded

```json
{
  "error": "Rate limit exceeded"
}
```

#### 500 - Internal Server Error

```json
{
  "error": "Internal error"
}
```

## Exemplos de Uso

### Exemplo 1: Envio de Laudo Básico

```bash
curl -X POST https://omni.com.br/api/lab/submit \
  -H "Content-Type: application/json" \
  -d '{
    "patientEmail": "joao.paciente@email.com",
    "doctorName": "Dr. Maria Santos",
    "examDate": "2024-10-25",
    "documento": "LAB-2024-001",
    "cpf": "12345678901",
    "report": {
      "fileName": "hemograma_completo.pdf",
      "fileContent": "JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCgoyIDAgb2JqCjw8Ci9UeXBlIC9QYWdlcwovS2lkcyBbMyAwIFJdCi9Db3VudCAxCj4+CmVuZG9iagoKMyAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDIgMCBSCi9NZWRpYUJveCBbMCAwIDIxMiAyNzJdCj4+CmVuZG9iagoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAwNzQgMDAwMDAgbiAKMDAwMDAwMDEyMCAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDQKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjE3OQolJUVPRgo="
    }
  }'
```

### Exemplo 2: CPF com Formatação

```json
{
  "patientEmail": "maria.silva@email.com",
  "doctorName": "Dr. Carlos Oliveira",
  "examDate": "2024-10-26",
  "documento": "LAB-2024-002",
  "cpf": "123.456.789-01",
  "report": {
    "fileName": "raio_x_torax.jpg",
    "fileContent": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
  }
}
```

### Exemplo 3: Usando PowerShell no Windows

```powershell
$body = @{
    patientEmail = "paciente@email.com"
    doctorName = "Dr. João Silva"
    examDate = "2024-11-17"
    documento = "LAB-2024-003"
    cpf = "12345678901"
    report = @{
        fileName = "resultado_exame.pdf"
        fileContent = "JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PA..."
    }
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "https://omni.com.br/api/lab/submit" `
                  -Method POST `
                  -ContentType "application/json" `
                  -Body $body
```

## Fluxo do Sistema

1. **Recebimento**: API recebe o laudo do laboratório
2. **Validação**: Verifica formato dos dados e existência do paciente
3. **Rate Limiting**: Aplica limite de 10 req/hora por IP
4. **Armazenamento**: Salva o laudo na base de dados
5. **Notificação**: Cria notificação para o paciente
6. **Resposta**: Retorna confirmação com IDs para rastreamento

## Códigos de Status HTTP

| Código | Significado           | Descrição                               |
| ------ | --------------------- | --------------------------------------- |
| 202    | Accepted              | Laudo recebido e processado com sucesso |
| 400    | Bad Request           | Erro nos dados enviados                 |
| 404    | Not Found             | Paciente não encontrado                 |
| 429    | Too Many Requests     | Limite de requisições excedido          |
| 500    | Internal Server Error | Erro interno do servidor                |

## Segurança e Boas Práticas

### Rate Limiting

- **Limite**: 10 requisições por IP por hora
- **Janela**: 60 minutos (3600 segundos)
- **Identificação**: Por IP (x-forwarded-for, x-real-ip ou connection.remoteAddress)
- **Implementação**: Em memória (para PoC), usar Redis em produção

### Validação de Dados

- CPF deve ter exatamente 11 dígitos numéricos
- Arquivos limitados a 2KB (pós Base64)
- Todos os campos obrigatórios devem estar presentes
- Sanitização automática de CPF (remove formatação)

### Formatos Aceitos

- **CPF**: Com ou sem formatação (123.456.789-01 ou 12345678901)
- **Data**: Formato ISO (YYYY-MM-DD)
- **Arquivo**: Qualquer formato, codificado em Base64
- **E-mail**: Validação básica de formato

## Ambiente de Desenvolvimento

### Configuração Local

```bash
# Navegar para o diretório web
cd web

# Instalar dependências
pnpm install

# Configurar banco de dados
npx prisma migrate dev

# Iniciar servidor de desenvolvimento
pnpm run dev
```

### Testes com CPFs Fictícios

Para testes, utilize CPFs fictícios já cadastrados no sistema:

- CPF: `12345678901` (João da Silva - user@email.com)
- CPF: `98765432100` (Maria Santos - maria@email.com)

### Testando a API Localmente

```bash
# Ambiente local
curl -X POST http://localhost:3000/api/lab/submit \
  -H "Content-Type: application/json" \
  -d '{
    "patientEmail": "user@email.com",
    "doctorName": "Dr. Teste",
    "examDate": "2024-11-17",
    "documento": "LAB-LOCAL-001",
    "cpf": "12345678901",
    "report": {
      "fileName": "teste.pdf",
      "fileContent": "dGVzdGUgY29udGV1ZG8="
    }
  }'
```

## Estrutura de Arquivos

### Arquivos da API

- `web/src/app/api/lab/submit/route.ts` - Endpoint principal
- `web/src/components/ExternalLabSubmit.tsx` - Interface para teste
- `web/prisma/schema.prisma` - Modelos de dados
- `web/docs/API_DOCUMENTACAO.md` - Esta documentação

### Modelos de Dados

```prisma
model User {
  id            String         @id @default(cuid())
  email         String         @unique
  cpf           String?        @unique
  cnpj          String?        @unique
  // ... outros campos
  notifications Notification[]
}

model Notification {
  id        String             @id @default(cuid())
  userId    String
  type      NotificationType
  payload   Json
  status    NotificationStatus @default(UNREAD)
  createdAt DateTime           @default(now())
  updatedAt DateTime           @updatedAt
  user      User               @relation(fields: [userId], references: [id])
}

model Report {
  id          String   @id @default(cuid())
  userId      String
  fileName    String
  fileContent String   @db.Text
  doctorName  String?
  examDate    DateTime?
  documento   String?
  createdAt   DateTime @default(now())
  // ... outros campos
}
```

## Monitoramento e Logs

### Logs da API

- Todas as requisições são logadas com timestamp
- Erros incluem stack trace para debugging
- Rate limiting é registrado com IP do cliente

### Métricas Importantes

- Número de laudos recebidos por hora/dia
- Taxa de erro por tipo (400, 404, 429, 500)
- Tempo de resposta médio
- IPs com mais requisições

## Roadmap / Melhorias Futuras

### Autenticação

- [ ] Implementar tokens JWT para autenticação
- [ ] Sistema de API keys por laboratório
- [ ] Rotação automática de tokens

### Performance

- [ ] Migrar rate limiting para Redis
- [ ] Implementar cache para consultas de usuário
- [ ] Otimizar queries do banco de dados

### Funcionalidades

- [ ] Suporte a múltiplos arquivos por laudo
- [ ] Validação de assinatura digital
- [ ] Webhook para confirmação de recebimento
- [ ] API para consulta de status do laudo

### Segurança

- [ ] Rate limiting por laboratório/API key
- [ ] Validação de origem/IP permitido
- [ ] Criptografia dos arquivos em repouso
- [ ] Auditoria completa de acessos

## Suporte e Contato

Para dúvidas técnicas ou problemas de integração:

- **E-mail**: suporte-api@omni.com.br
- **Documentação**: https://docs.omni.com.br/api
- **Status da API**: https://status.omni.com.br
- **Repository**: omnimvp (GitHub)

---

**Versão da API**: 1.0  
**Última atualização**: 17 de novembro de 2025  
**Ambiente**: Proof of Concept  
**Status**: Em desenvolvimento
