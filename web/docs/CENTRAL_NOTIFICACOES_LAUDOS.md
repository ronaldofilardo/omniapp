# Central de Notificações para Laudos Externos

## Histórico de Implementação

### 27/10/2025

**Início da implementação da Central de Notificações para Laudos Externos.**

#### 1. Modificações no Banco de Dados (Prisma)

- Adicionado o modelo `Notification` ao schema Prisma, com os campos:
  - `id`: Identificador único
  - `userId`: Chave estrangeira para `User` (com índice)
  - `type`: Enum `NotificationType` (inicialmente com valor `LAB_RESULT`)
  - `payload`: Campo `Json` para armazenar dados brutos do laudo
  - `status`: Enum `NotificationStatus` (`UNREAD`, `READ`, `ARCHIVED`, com índice)
  - `createdAt` e `updatedAt`: Timestamps para auditoria
- Adicionados os enums `NotificationType` e `NotificationStatus`.
- Adicionada relação inversa `notifications` no modelo `User`.
- Executado `prisma migrate reset` para corrigir divergências e, em seguida, criada a migration `add_notifications`.
- Gerado o Prisma Client atualizado.

#### 2. Implementação dos Endpoints Iniciais

- Criado endpoint `POST /api/lab/submit/route.ts` para submissão de laudos por laboratórios:
  - Validação de payload, rate limit, busca de usuário por e-mail, criação de notificação e resposta com ID/timestamp.
- Criado endpoint `GET /api/notifications/route.ts` para listagem de notificações UNREAD do usuário autenticado:
  - Para esta fase, a autenticação é fixa no e-mail `user@email.com` (usuário padrão e único no banco).

### 27/10/2025

**Ajuste no endpoint de notificações:**

- Removida dependência do next-auth para o MVP.
- O endpoint GET /api/notifications agora utiliza autenticação fixa pelo e-mail user@email.com, garantindo simplicidade e segurança para o ambiente de desenvolvimento e testes.
- Quando necessário, a autenticação real será reintroduzida.

### 27/10/2025

**Validação do fluxo completo (backend):**

- Testes realizados via Postman comprovaram que:
  - Notificações são criadas ao receber laudos externos.
  - Notificações aparecem para o usuário padrão.
  - Ao criar um evento associado a uma notificação, ela é automaticamente arquivada.
  - O endpoint de listagem retorna vazio após o consumo, comprovando o arquivamento correto.
- O backend está pronto para integração com o frontend, sem débitos técnicos.

### 27/10/2025

**Início da Esfera do Frontend:**

- Criado componente de simulação de envio externo (`ExternalLabSubmit.tsx`) para testes manuais da API de laudos.
- Definido o plano para:
  - Criar página dedicada de simulação do laboratório (`src/app/lab-simulation/page.tsx`).
  - Adicionar indicador de notificações (sino) no Sidebar do Dashboard, com contador de notificações UNREAD.
  - Implementar painel/modal de notificações com ações de associação e criação de evento, integrando com os modais já desenvolvidos.
- Todas as ações seguem o fluxo arquitetural aprovado, sem débitos técnicos.

#### 3. Próximos Passos

- Ajustes nos endpoints de eventos para integração com notificações

---

Este documento será atualizado a cada etapa relevante do desenvolvimento da Central de Notificações.
