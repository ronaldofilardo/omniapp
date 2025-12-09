# Tests com Redis Mock - Limitações Conhecidas

## Status Atual

Os testes de `redisCache.test.ts` e `performanceMetrics.test.ts` têm 26 falhas quando executados sem um Redis real porque:

1. **Instanciação no Import**: O Redis é inst anc iado quando o módulo é importado:

   ```typescript
   const redis = new Redis({ url: ..., token: ... })
   ```

2. **Mock Timing**: O mock do Vitest é aplicado após o módulo já ter sido carregado, então a instância real é criada em vez da mockada.

## Soluções Possíveis

### Opção 1: Testes de Integração (Recomendado)

- Mover esses testes para `tests/integration/`
- Executar com um Redis real (Docker ou Upstash)
- Garante que o comportamento real está correto

### Opção 2: Refatoração para Injeção de Dependência

```typescript
// Antes
const redis = new Redis(...)

// Depois
export function getRedisInstance() {
  return redis
}
```

### Opção 3: Skip Condicional

Adicionar skip quando Redis não está disponível:

```typescript
const hasRedis = !!process.env.UPSTASH_REDIS_REST_URL

it.skipIf(!hasRedis)('deve retornar valor do cache', async () => {
  ...
})
```

## Testes que Passam

✅ Rate Limit (17/17)
✅ Virus Scan (17/17)  
✅ EnviarDocumento (6/6)
✅ Circuit Breaker (16/16)
✅ Storage Manager (8/8)

## Próximos Passos

1. Decidir entre integração real ou refatoração
2. Documentar requisitos de ambiente para testes completos
3. Configurar CI/CD com Redis para testes de integração
