# Sistema de Monitoramento de Performance

## Visão Geral

Sistema completo de monitoramento de performance implementado para garantir SLA de **< 500ms no P95** para operações críticas. Utiliza Redis para métricas distribuídas e cache inteligente com invalidação baseada em tags.

## Arquitetura

### Componentes Principais

```
┌─────────────────────────────────────────────────────────────┐
│                      API Routes                             │
│  (events, notifications, reports, professionals)            │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│          withPerformanceTracking Middleware                 │
│  - Mede latência de requisições                            │
│  - Adiciona header X-Response-Time                         │
│  - Registra métricas no Redis                              │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│                  withRLS Middleware                         │
│  - Configura contexto de segurança RLS                     │
│  - Isola dados por usuário                                 │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│              Cache Layer (Redis)                            │
│  - Cache-aside pattern                                      │
│  - Tag-based invalidation                                   │
│  - TTL configurável por tipo de dado                       │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL                                │
│  - Dados persistidos com RLS                               │
└─────────────────────────────────────────────────────────────┘
```

## 1. Métricas de Performance

### 1.1 Serviço de Métricas (`performanceMetrics.ts`)

Armazena métricas de latência em time-series no Redis com retenção de 1 hora.

**Principais Funções:**

```typescript
// Registrar métrica de requisição
await recordRequestMetric({
  path: "/api/events",
  method: "GET",
  statusCode: 200,
  duration: 120, // ms
  timestamp: Date.now(),
  cacheHit: true,
});

// Obter estatísticas de performance
const stats = await getPerformanceStats(60); // últimos 60 minutos
// Retorna: {
//   totalRequests,
//   averageLatency,
//   p50, p95, p99,
//   successRate,
//   cacheHitRate,
//   slowRequests
// }
```

**Métricas Coletadas:**

- **P50 (Mediana)**: 50% das requisições abaixo deste valor
- **P95**: 95% das requisições abaixo deste valor (SLA target)
- **P99**: 99% das requisições abaixo deste valor
- **Latência Média**: Média aritmética de todas as requisições
- **Taxa de Sucesso**: % de requisições com status 2xx
- **Cache Hit Rate**: % de requisições servidas do cache
- **Requisições Lentas**: Contagem de requisições > 500ms

**Retenção de Dados:**

- Métricas individuais: 1 hora (3600s)
- Agregações: Calculadas em tempo real

### 1.2 Middleware de Performance (`performanceMiddleware.ts`)

Wrapper HOF que adiciona tracking automático a handlers.

**Uso:**

```typescript
export async function GET(req: NextRequest) {
  return withPerformanceTracking(async (req) => {
    // ... lógica do handler
  })(req);
}
```

**Headers Adicionados:**

- `X-Response-Time`: Tempo de resposta em ms

**Alertas Automáticos:**

- Console warning para requisições > 500ms

## 2. Sistema de Cache

### 2.1 Cache Distribuído (`redisCache.ts`)

Sistema de cache com invalidação inteligente baseada em tags.

**TTLs Padrão:**

```typescript
export const CACHE_TTL = {
  EVENTS_LIST: 300, // 5 minutos
  EVENT_DETAIL: 600, // 10 minutos
  PROFESSIONALS: 900, // 15 minutos
  USER_PROFILE: 1800, // 30 minutos
  NOTIFICATIONS: 60, // 1 minuto
  REPORTS: 300, // 5 minutos
};
```

### 2.2 Padrão Cache-Aside

**Exemplo de Uso:**

```typescript
const { data, fromCache } = await cacheGetOrSet(
  cacheKey,
  async () => {
    // Fetcher: busca do banco quando cache miss
    return await prisma.healthEvent.findMany({ where: { userId } });
  },
  { ttl: CACHE_TTL.EVENTS_LIST }
);

// Adicionar header de cache
response.headers.set("X-Cache-Hit", fromCache ? "true" : "false");
```

### 2.3 Invalidação de Cache

**Sistema de Tags:**

Cada entrada de cache pode ter múltiplas tags para invalidação em grupo:

```typescript
// Invalidar todos os caches relacionados a um usuário
await cacheInvalidateByTag(`events:user:${userId}`);
await cacheInvalidateByTag(`notifications:user:${userId}`);

// Invalidar múltiplas tags ao mesmo tempo
await Promise.all([
  cacheInvalidateByTag(`reports:user:${senderId}`),
  cacheInvalidateByTag(`reports:user:${receiverId}`),
  cacheInvalidateByTag(`notifications:user:${receiverId}`),
]);
```

**Quando Invalidar:**

- **POST**: Após criar novo recurso
- **PUT**: Após atualizar recurso existente
- **DELETE**: Após deletar recurso

**Exemplo Completo (POST):**

```typescript
export async function POST(req: Request) {
  try {
    const user = await auth();
    const professional = await prisma.professional.create({
      data: { name, specialty, userId: user.id },
    });

    // Invalidar cache após sucesso
    await cacheInvalidateByTag(`professionals:user:${user.id}`);

    return NextResponse.json(professional, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}
```

### 2.4 Helpers de Cache Key

Funções auxiliares para gerar chaves consistentes:

```typescript
// Lista de eventos de um usuário
getCacheKeyForUserEvents(userId, page, limit);
// Retorna: 'events:user:{userId}:page:{page}:limit:{limit}'

// Notificações de um usuário
getCacheKeyForUserNotifications(userId);
// Retorna: 'notifications:user:{userId}'

// Profissionais de um usuário
getCacheKeyForUserProfessionals(userId);
// Retorna: 'professionals:user:{userId}'

// Relatórios com filtros
const cacheKey = `reports:user:${userId}:role:${role}:page:${page}:limit:${limit}`;
```

## 3. SLA e Targets de Performance

### 3.1 Objetivos

| Métrica                | Target             | Status          |
| ---------------------- | ------------------ | --------------- |
| **P95 Latency**        | < 500ms            | ✅ Implementado |
| **Cache Hit Rate**     | > 50% após warm-up | ✅ Implementado |
| **Requisições Lentas** | < 5% do total      | ✅ Monitorado   |
| **Uptime**             | > 99.9%            | 📊 Em medição   |

### 3.2 Rotas Críticas Monitoradas

1. **GET /api/events** - Lista de eventos (cache: 5min)
2. **GET /api/notifications** - Notificações (cache: 1min)
3. **GET /api/reports** - Relatórios (cache: 5min)
4. **GET /api/professionals** - Profissionais (cache: 15min)

### 3.3 Alertas Configurados

**Requisições Lentas (> 500ms):**

```
[PERF] Request lenta detectada:
  Path: /api/events
  Method: GET
  Duration: 650ms
  Cache: miss
```

## 4. Monitoramento e Observabilidade

### 4.1 Endpoint de Métricas

**GET /api/admin/performance-metrics** (Admin only)

Retorna estatísticas agregadas de performance:

```json
{
  "latency": {
    "average": 120,
    "p50": 95,
    "p95": 180,
    "p99": 250,
    "requests": 1523
  },
  "cache": {
    "hitRate": 67.5,
    "hits": 1028,
    "misses": 495
  },
  "sla": {
    "target": 500,
    "compliance": 98.2,
    "slowRequests": 27
  },
  "timestamp": "2025-12-05T18:30:00.000Z",
  "window": "60 minutes"
}
```

**Curl de Exemplo:**

```bash
curl -H "Cookie: auth-token=..." \
  http://localhost:3000/api/admin/performance-metrics
```

### 4.2 Headers de Resposta

Todas as rotas monitoradas incluem headers customizados:

```http
X-Response-Time: 120ms
X-Cache-Hit: true
```

### 4.3 Logs Estruturados

```typescript
console.log("[PERF] Métrica registrada:", {
  path: "/api/events",
  method: "GET",
  duration: 120,
  cacheHit: true,
  userId: "user-123",
  timestamp: new Date().toISOString(),
});
```

## 5. Configuração

### 5.1 Variáveis de Ambiente

```env
# Redis para Cache e Métricas
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Habilitar/Desabilitar Cache
REDIS_CACHE_ENABLED=1  # 0 para desabilitar

# Node Environment
NODE_ENV=production
```

### 5.2 Ajustar TTLs

Editar `src/lib/cache/redisCache.ts`:

```typescript
export const CACHE_TTL = {
  EVENTS_LIST: 300, // Alterar para 600 = 10 minutos
  NOTIFICATIONS: 60, // Alterar para 30 = 30 segundos
  // ...
};
```

### 5.3 Desabilitar Cache (Debug)

```env
REDIS_CACHE_ENABLED=0
```

Todas as operações de cache falharão silenciosamente, retornando sempre cache miss.

## 6. Troubleshooting

### 6.1 Performance Degradada

**Sintomas:** P95 > 500ms

**Diagnóstico:**

1. Verificar cache hit rate no endpoint de métricas
2. Verificar logs de requisições lentas
3. Verificar conexão com Redis

**Soluções:**

```bash
# 1. Verificar Redis está online
curl $UPSTASH_REDIS_REST_URL/ping

# 2. Limpar todo cache (forçar rebuild)
# Via Redis CLI ou script

# 3. Aumentar TTLs para reduzir cache misses
# Editar CACHE_TTL em redisCache.ts

# 4. Verificar índices do PostgreSQL
# Queries lentas podem indicar falta de índices
```

### 6.2 Cache Stale (Dados Desatualizados)

**Sintomas:** Dados antigos sendo servidos

**Causa Provável:** Invalidação não executada após mutação

**Solução:**

```typescript
// Verificar se todos os POSTs/PUTs/DELETEs invalidam cache
await cacheInvalidateByTag(`events:user:${userId}`);
```

**Forçar Invalidação Manual:**

```typescript
// Em caso de emergência, limpar cache específico
import { cacheInvalidateByTag } from "@/lib/cache/redisCache";

await cacheInvalidateByTag("events:user:user-123");
```

### 6.3 Cache Miss Rate Alto

**Sintomas:** < 30% de cache hit rate

**Causas Comuns:**

1. TTLs muito curtos
2. Muitas invalidações desnecessárias
3. Chaves de cache inconsistentes

**Soluções:**

```typescript
// 1. Aumentar TTLs
CACHE_TTL.EVENTS_LIST = 600; // 5min → 10min

// 2. Revisar invalidações
// Invalidar apenas tags necessárias

// 3. Padronizar cache keys
// Usar sempre os helpers getCacheKeyFor*
```

### 6.4 Redis Connection Errors

**Sintomas:** Logs de erro "[CACHE] Erro ao buscar do cache"

**Diagnóstico:**

```bash
# Testar conexão Redis
curl $UPSTASH_REDIS_REST_URL/ping

# Verificar rate limits Upstash
# Dashboard: https://console.upstash.com
```

**Fail-Safe:**

O sistema implementa fail-open: se Redis falhar, requisições continuam normalmente sem cache.

### 6.5 Métricas Não Aparecem

**Checklist:**

```typescript
// 1. Verificar middleware está aplicado
export async function GET(req: NextRequest) {
  return withPerformanceTracking(async (req) => {
    // ✅ Correto
  })(req);
}

// 2. Verificar Redis está salvando
// Logs devem mostrar: "[PERF] Métrica registrada"

// 3. Verificar endpoint de admin
// Requer role ADMIN para acessar
```

## 7. Boas Práticas

### 7.1 Aplicar Cache em Nova Rota

```typescript
import { withPerformanceTracking } from "@/lib/middleware/performanceMiddleware";
import {
  cacheGetOrSet,
  cacheInvalidateByTag,
  CACHE_TTL,
} from "@/lib/cache/redisCache";

export async function GET(req: NextRequest) {
  return withPerformanceTracking(async (req) => {
    return withRLS(req, async (req) => {
      const user = await auth();

      const cacheKey = `myresource:user:${user.id}`;

      const { data, fromCache } = await cacheGetOrSet(
        cacheKey,
        async () => {
          return await prisma.myResource.findMany({
            where: { userId: user.id },
          });
        },
        { ttl: CACHE_TTL.EVENTS_LIST }
      );

      const response = NextResponse.json(data);
      response.headers.set("X-Cache-Hit", fromCache ? "true" : "false");
      return response;
    });
  })(req);
}

export async function POST(req: Request) {
  try {
    const user = await auth();
    const resource = await prisma.myResource.create({
      data: { userId: user.id },
    });

    // ✅ Invalidar cache após mutação
    await cacheInvalidateByTag(`myresource:user:${user.id}`);

    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}
```

### 7.2 Escolher TTL Adequado

| Tipo de Dado                         | TTL Recomendado | Razão                      |
| ------------------------------------ | --------------- | -------------------------- |
| **Altamente Volátil** (notificações) | 30-60s          | Dados mudam frequentemente |
| **Moderado** (eventos, reports)      | 5-10min         | Balanço cache/atualização  |
| **Estável** (perfil, professionals)  | 15-30min        | Raramente mudam            |
| **Estático** (configs)               | 1-24h           | Quase nunca mudam          |

### 7.3 Monitorar Constantemente

```bash
# Verificar métricas a cada 5 minutos
watch -n 300 "curl -s http://localhost:3000/api/admin/performance-metrics | jq"

# Alertar se P95 > 500ms
if [ $(jq .latency.p95) -gt 500 ]; then
  echo "ALERTA: P95 acima do SLA!"
fi
```

## 8. Roadmap Futuro

### 8.1 Melhorias Planejadas

- [ ] Dashboard visual de métricas (Grafana/Datadog)
- [ ] Alertas automáticos (Slack/Email)
- [ ] Cache warming automático
- [ ] Distributed tracing (OpenTelemetry)
- [ ] A/B testing de TTLs
- [ ] Compressão de cache (gzip)
- [ ] Cache multi-tier (L1: memory, L2: Redis)

### 8.2 Otimizações Avançadas

```typescript
// Cache predictivo (prefetch)
async function prefetchUserData(userId: string) {
  await Promise.all([
    cacheGetOrSet(`events:user:${userId}`, ...),
    cacheGetOrSet(`notifications:user:${userId}`, ...),
    cacheGetOrSet(`professionals:user:${userId}`, ...)
  ]);
}

// Cache warming no boot
async function warmupCache() {
  const activeUsers = await getActiveUsers();
  await Promise.all(activeUsers.map(u => prefetchUserData(u.id)));
}
```

## 9. Referências

- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [Cache-Aside Pattern](https://docs.microsoft.com/azure/architecture/patterns/cache-aside)
- [Percentile Latency](https://www.honeycomb.io/blog/how-percentiles-work)
- [Upstash Redis](https://docs.upstash.com/redis)

## 10. Suporte

**Issues/Bugs:** Abrir issue no repositório com:

- Logs relevantes
- Headers da requisição
- Output do endpoint /api/admin/performance-metrics
- Ambiente (dev/staging/prod)

**Performance Review:** Agendar com time de SRE mensalmente

---

**Última Atualização:** 5 de Dezembro de 2025  
**Versão:** 1.0  
**Autores:** Time de Engenharia Omni
