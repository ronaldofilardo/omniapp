# Estratégia de Compatibilidade com Vercel Free Account

## Visão Geral

Este documento descreve a estratégia implementada para garantir compatibilidade com as restrições da conta gratuita do Vercel, priorizando deploy sem problemas.

## Restrições da Vercel Free

### Timeouts de Função

- **Limite**: 10 segundos por execução de função serverless
- **Impacto**: Funções que demoram mais falham
- **Mitigação**: Processamento mínimo, arquivos pequenos

### Recursos Limitados

- **CPU/Memória**: Restritos para conta free
- **Storage**: Sem armazenamento persistente
- **Custos**: Limites mensais rigorosos

## Estratégia de Upload

### Limites por Ambiente

| Ambiente              | Limite de Upload | Justificativa                        |
| --------------------- | ---------------- | ------------------------------------ |
| **Produção (Vercel)** | 2KB              | Evita timeouts, processamento rápido |
| **Desenvolvimento**   | 10KB             | Permite testes mais realistas        |

### Endpoints Afetados

#### `/api/upload`

- **Limite**: 2KB (prod) / 10KB (dev)
- **Propósito**: Upload genérico de imagens
- **Uso**: Thumbnails, avatares pequenos

#### `/api/upload-file`

- **Limite**: 2KB (prod) / 10KB (dev)
- **Propósito**: Upload de arquivos para eventos
- **Uso**: Documentos pequenos em consultas

#### `/api/document/submit`

- **Limite**: 5MB (base64 decodificado)
- **Status**: ⚠️ Temporário até Cloudinary
- **Nota**: Será reduzido para 2KB após implementação de storage em nuvem

## Implementação Técnica

### Configuração Dinâmica

```typescript
const MAX_FILE_SIZE =
  process.env.NODE_ENV === "production" ? 2 * 1024 : 10 * 1024;
```

### Validação Consistente

```typescript
if (file.size >= MAX_FILE_SIZE) {
  const maxSizeKB = (MAX_FILE_SIZE / 1024).toFixed(0);
  const actualSizeKB = (file.size / 1024).toFixed(0);
  return NextResponse.json(
    {
      error: `Arquivo deve ter menos de ${maxSizeKB}KB. Tamanho atual: ${actualSizeKB}KB`,
    },
    { status: 400 }
  );
}
```

### Warnings Preventivos em Desenvolvimento

```typescript
// Warning em desenvolvimento para arquivos próximos ao limite de produção
if (process.env.NODE_ENV === "development" && file.size > 1.5 * 1024) {
  console.warn(
    `[WARNING] Arquivo de ${file.size} bytes se aproxima do limite de produção (2KB)`
  );
}
```

## Plano de Migração

### Fase 1: Cloudinary Implementation ✅

- Implementar storage em nuvem
- Migrar uploads grandes para Cloudinary
- Manter limites pequenos como fallback

### Fase 2: Limites Progressivos 📅

- Aumentar limites gradualmente
- Monitorar performance e custos
- Ajustar baseado em métricas

### Fase 3: Otimização 🚀

- Compressão automática de imagens
- CDN para delivery rápido
- Cache inteligente

## Monitoramento

### Métricas Críticas

- **Tempo de resposta**: Manter <5s em produção
- **Taxa de falha**: <1% de timeouts
- **Uso de recursos**: Monitorar CPU/memória

## Testes Automatizados

### Cobertura de Testes

- ✅ **Limites Dinâmicos**: Testes validam limites por ambiente
- ✅ **Warnings Preventivos**: Testes verificam logs de warning em desenvolvimento
- ✅ **Mensagens de Erro**: Testes confirmam mensagens contextuais
- ✅ **Compatibilidade**: Testes garantem funcionamento em produção

### Estratégia de Testes

```typescript
// Teste para limite dinâmico
describe("File size validation", () => {
  it("should reject files larger than limit", () => {
    process.env.NODE_ENV = "production";
    const largeFile = createFile(3 * 1024); // 3KB > 2KB
    expect(validateFile(largeFile)).toBe(false);
  });

  it("should warn in development for files near production limit", () => {
    process.env.NODE_ENV = "development";
    const consoleSpy = vi.spyOn(console, "warn");
    const file = createFile(2 * 1024); // 2KB > 1.5KB
    validateFile(file);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("WARNING"));
  });
});
```

### Ambiente de Testes

- **NODE_ENV=test**: Usa limites de desenvolvimento (10KB)
- **Mocks Completos**: Simula sistema de arquivos e banco de dados
- **Validação Automática**: Testes rodam em CI/CD

## Garantias de Sucesso

- ✅ **Deploy Aprovado**: Limites de 2KB garantem compatibilidade
- ✅ **Desenvolvimento Ágil**: 10KB permitem testes realistas
- ✅ **Alertas Preventivos**: Warnings evitam surpresas
- ✅ **Documentação Clara**: Equipe informada sobre restrições
- ✅ **Testes Automatizados**: Validação contínua dos limites

### Alertas

- Timeout >8s em produção
- Uploads rejeitados >10/min
- Tamanho médio de arquivo aumentando

## Riscos e Mitigações

### Risco: Mudanças Acidentais

- **Mitigação**: Limites hardcoded, não configuráveis
- **Controle**: Code review obrigatório para mudanças

### Risco: Inconsistência

- **Mitigação**: Documentação clara, testes automatizados
- **Validação**: CI/CD verifica limites por ambiente

### Risco: Usuários Insatisfeitos

- **Mitigação**: Comunicação clara sobre limites
- **Alternativa**: Orientar para uso de links externos

## Conclusão

A estratégia atual prioriza **compatibilidade com Vercel free** sobre flexibilidade máxima. Os limites conservadores garantem:

- ✅ Deploy sem problemas
- ✅ Performance consistente
- ✅ Custos controlados
- ✅ Experiência usuário estável

Após implementação do Cloudinary, os limites poderão ser aumentados gradualmente, mantendo a estabilidade do sistema.
