# Guia de Uso - Error Boundaries

## Visão Geral

Error Boundaries são componentes React que capturam erros JavaScript em qualquer lugar na árvore de componentes abaixo deles, registram esses erros e exibem uma UI de fallback ao invés de quebrar toda a aplicação.

## Quando Usar

### ✅ USE Error Boundaries em:

- Páginas completas (`PageErrorBoundary`)
- Formulários complexos (`FormErrorBoundary`)
- Componentes de upload (`UploadErrorBoundary`)
- Listas e tabelas (`ListErrorBoundary`)
- Componentes que fazem chamadas API
- Componentes que processam dados externos
- Componentes com lógica complexa

### ❌ NÃO use Error Boundaries para:

- Event handlers (use try-catch normal)
- Código assíncrono (use try-catch com promises)
- Server-side rendering errors
- Erros no próprio Error Boundary

## Exemplos de Uso

### 1. Página Completa

```typescript
// app/dashboard/page.tsx
import { PageErrorBoundary } from "@/components/ErrorBoundaryWrappers";

export default function DashboardPage() {
  return (
    <PageErrorBoundary pageName="Dashboard">
      <DashboardContent />
    </PageErrorBoundary>
  );
}
```

### 2. Formulário

```typescript
// components/UserForm.tsx
import { FormErrorBoundary } from "@/components/ErrorBoundaryWrappers";

export function UserForm() {
  return (
    <FormErrorBoundary>
      <form onSubmit={handleSubmit}>{/* Campos do formulário */}</form>
    </FormErrorBoundary>
  );
}
```

### 3. Upload de Arquivos

```typescript
// components/FileUploader.tsx
import { UploadErrorBoundary } from "@/components/ErrorBoundaryWrappers";

export function FileUploader() {
  return (
    <UploadErrorBoundary>
      <DropZone />
      <FileList />
      <UploadButton />
    </UploadErrorBoundary>
  );
}
```

### 4. Lista/Tabela

```typescript
// components/UserList.tsx
import { ListErrorBoundary } from "@/components/ErrorBoundaryWrappers";

export function UserList() {
  return (
    <ListErrorBoundary>
      <Table>
        {users.map((user) => (
          <UserRow key={user.id} user={user} />
        ))}
      </Table>
    </ListErrorBoundary>
  );
}
```

### 5. Error Boundary Customizado

```typescript
// components/CustomComponent.tsx
import { ErrorBoundary } from "@/components/ErrorBoundary";

export function CustomComponent() {
  return (
    <ErrorBoundary
      fallback={
        <div className="text-center p-4">
          <p>Erro customizado para este componente</p>
        </div>
      }
      onError={(error, errorInfo) => {
        // Log customizado
        console.error("Erro capturado:", error);
        // Enviar para serviço de monitoramento
        // Sentry.captureException(error);
      }}
    >
      <ComplexComponent />
    </ErrorBoundary>
  );
}
```

## Hook useErrorHandler

Use este hook para lançar erros em event handlers ou código assíncrono:

```typescript
import { useErrorHandler } from "@/components/ErrorBoundary";

function MyComponent() {
  const throwError = useErrorHandler();

  const handleClick = async () => {
    try {
      await fetchData();
    } catch (error) {
      // Isso será capturado pelo Error Boundary pai
      throwError(error as Error);
    }
  };

  return <button onClick={handleClick}>Carregar</button>;
}
```

## Aninhamento de Error Boundaries

Você pode aninhar Error Boundaries para ter controle granular:

```typescript
function App() {
  return (
    <PageErrorBoundary pageName="App">
      <Header />

      <main>
        <ListErrorBoundary>
          <UserList />
        </ListErrorBoundary>

        <FormErrorBoundary>
          <UserForm />
        </FormErrorBoundary>
      </main>

      <Footer />
    </PageErrorBoundary>
  );
}
```

**Benefício**: Se `UserList` quebrar, apenas ela será substituída pelo fallback, o resto da página continua funcionando.

## Integração com Monitoramento

### Sentry

```typescript
import * as Sentry from "@sentry/nextjs";
import { ErrorBoundary } from "@/components/ErrorBoundary";

<ErrorBoundary
  onError={(error, errorInfo) => {
    Sentry.captureException(error, {
      contexts: {
        react: errorInfo,
      },
    });
  }}
>
  <YourComponent />
</ErrorBoundary>;
```

### LogRocket

```typescript
import LogRocket from "logrocket";
import { ErrorBoundary } from "@/components/ErrorBoundary";

<ErrorBoundary
  onError={(error, errorInfo) => {
    LogRocket.captureException(error, {
      extra: {
        errorInfo,
      },
    });
  }}
>
  <YourComponent />
</ErrorBoundary>;
```

## Testing Error Boundaries

```typescript
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Componente que sempre lança erro
const ThrowError = () => {
  throw new Error("Test error");
};

describe("ErrorBoundary", () => {
  it("should catch and display error", () => {
    // Suprimir console.error no teste
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/algo deu errado/i)).toBeInTheDocument();

    spy.mockRestore();
  });

  it("should call onError callback", () => {
    const onError = vi.fn();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();

    spy.mockRestore();
  });
});
```

## Best Practices

### ✅ Faça

1. **Use em limites lógicos da aplicação**

   - Páginas, seções, componentes complexos

2. **Forneça fallbacks informativos**

   - Explique o que aconteceu
   - Ofereça ações de recuperação

3. **Log erros apropriadamente**

   - Console em desenvolvimento
   - Serviços de monitoramento em produção

4. **Teste os Error Boundaries**

   - Verifique que capturam erros
   - Teste os fallbacks

5. **Considere a experiência do usuário**
   - Mantenha o contexto quando possível
   - Ofereça formas de recuperação

### ❌ Evite

1. **Não use para controle de fluxo**

   - Error Boundaries são para erros inesperados
   - Use condicionais para lógica condicional

2. **Não capture tudo no topo**

   - Error Boundary no root quebra tudo
   - Prefira múltiplos boundaries granulares

3. **Não ignore erros silenciosamente**

   - Sempre log o erro
   - Considere notificar o usuário

4. **Não use para validação**
   - Validação deve ser feita antes
   - Error Boundaries são último recurso

## Estrutura Recomendada

```
app/
├── layout.tsx (PageErrorBoundary no root)
├── dashboard/
│   └── page.tsx (PageErrorBoundary específico)
│       ├── UserList (ListErrorBoundary)
│       ├── UserForm (FormErrorBoundary)
│       └── FileUpload (UploadErrorBoundary)
```

## Checklist de Implementação

- [ ] Identificar componentes críticos
- [ ] Adicionar Error Boundaries apropriados
- [ ] Implementar fallbacks informativos
- [ ] Configurar logging de erros
- [ ] Integrar com monitoramento (Sentry/LogRocket)
- [ ] Escrever testes para Error Boundaries
- [ ] Documentar pontos de falha conhecidos
- [ ] Revisar UX dos fallbacks
- [ ] Testar em diferentes cenários de erro
- [ ] Validar em produção

## Troubleshooting

### Error Boundary não está capturando erros

**Possíveis causas:**

1. Erro em event handler → Use try-catch
2. Erro em código assíncrono → Use try-catch + useErrorHandler
3. Erro no próprio Error Boundary → Verifique o código
4. Erro em SSR → Error Boundaries só funcionam no cliente

### Fallback não está sendo exibido

**Possíveis causas:**

1. Error Boundary pai está capturando primeiro
2. Componente está fora do Error Boundary
3. Erro está sendo suprimido em outro lugar

### Performance degradada

**Possíveis causas:**

1. Muitos Error Boundaries aninhados
2. Fallbacks complexos demais
3. Logging excessivo

## Recursos Adicionais

- [React Error Boundaries Documentation](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Error Handling in React 18](https://react.dev/blog/2022/03/08/react-18-upgrade-guide#updates-to-error-boundaries)
- [Sentry React Integration](https://docs.sentry.io/platforms/javascript/guides/react/)

## Suporte

Para dúvidas ou problemas:

1. Verifique a documentação do componente
2. Revise exemplos neste guia
3. Consulte os testes unitários
4. Entre em contato com a equipe
