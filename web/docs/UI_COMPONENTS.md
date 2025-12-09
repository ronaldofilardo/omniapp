# Guia de Componentes UI

Este documento descreve o processo para adicionar novos componentes UI ao projeto, garantindo que todas as dependências sejam instaladas corretamente.

## Processo de Adição de Componentes UI

### 1. Adicionar Componente shadcn/ui

Para adicionar um novo componente shadcn/ui:

```bash
# Instalar o componente (exemplo: accordion)
npx shadcn@latest add accordion

# OU manualmente:
# 1. Copiar o arquivo do componente para src/components/ui/
# 2. Verificar as dependências necessárias
# 3. Instalar as dependências
```

### 2. Verificar Dependências

Após adicionar o componente, sempre execute a verificação de dependências:

```bash
# Verificar se todas as dependências estão instaladas
pnpm run check-deps

# Se faltarem dependências, o script mostrará quais instalar:
# pnpm add <dependencia-faltante>
```

### 3. Dependências Comuns dos Componentes shadcn/ui

| Componente    | Dependências Necessárias                                         |
| ------------- | ---------------------------------------------------------------- |
| accordion     | @radix-ui/react-accordion                                        |
| alert-dialog  | @radix-ui/react-alert-dialog                                     |
| aspect-ratio  | @radix-ui/react-aspect-ratio                                     |
| avatar        | @radix-ui/react-avatar                                           |
| calendar      | react-day-picker                                                 |
| carousel      | embla-carousel-react                                             |
| chart         | recharts                                                         |
| checkbox      | @radix-ui/react-checkbox                                         |
| collapsible   | @radix-ui/react-collapsible                                      |
| command       | cmdk                                                             |
| context-menu  | @radix-ui/react-context-menu                                     |
| dialog        | @radix-ui/react-dialog                                           |
| dropdown-menu | @radix-ui/react-dropdown-menu                                    |
| form          | @radix-ui/react-label, react-hook-form, @hookform/resolvers, zod |
| hover-card    | @radix-ui/react-hover-card                                       |
| input-otp     | input-otp                                                        |
| label         | @radix-ui/react-label                                            |
| popover       | @radix-ui/react-popover                                          |
| select        | @radix-ui/react-select                                           |
| sheet         | @radix-ui/react-dialog                                           |
| slider        | @radix-ui/react-slider                                           |
| switch        | @radix-ui/react-switch                                           |
| tabs          | @radix-ui/react-tabs                                             |
| textarea      | -                                                                |
| toast         | @radix-ui/react-toast                                            |
| tooltip       | @radix-ui/react-tooltip                                          |

### 4. Verificação Automática

O projeto inclui verificação automática de dependências:

- **Build local**: `pnpm build` executa `check-deps` automaticamente
- **Deploy Vercel**: O `vercel.json` inclui verificação antes do build
- **Script manual**: `pnpm run check-deps`

### 5. Troubleshooting

#### Erro: "Cannot find module 'package-name'"

1. Execute `pnpm run check-deps` para identificar dependências faltantes
2. Instale as dependências listadas
3. Execute o build novamente

#### Erro no Vercel

Se o deploy falhar no Vercel com erro de dependências:

1. Verifique se o `vercel.json` inclui `check-deps` no `buildCommand`
2. Certifique-se de que todas as dependências estão no `package.json`
3. Teste o build localmente primeiro

### 6. Boas Práticas

- Sempre execute `check-deps` após adicionar novos componentes
- Mantenha o `package.json` atualizado com todas as dependências
- Use o comando `npx shadcn@latest add` para adicionar componentes oficiais
- Teste o build localmente antes de fazer commit/deploy

### 7. Scripts Disponíveis

- `pnpm run check-deps`: Verifica dependências faltantes
- `pnpm build`: Build com verificação automática de dependências
- `pnpm run check-deps && pnpm build`: Verificação + build manual
