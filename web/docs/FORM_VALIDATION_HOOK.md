# Hook de Validação de Formulários - useFormValidation

## Visão Geral

O hook `useFormValidation` fornece uma solução padronizada e reutilizável para validação de formulários em toda a aplicação. Ele centraliza a lógica de validação, garante consistência nas mensagens de erro e suporta diferentes timings de validação (onChange, onBlur, onSubmit).

## Características

- ✅ **Validação Padronizada**: Regras de validação consistentes em toda a aplicação
- ✅ **Timing Flexível**: Valide em onChange, onBlur ou onSubmit
- ✅ **Regras Built-in**: Email, CPF, CNPJ, telefone, URL, tamanho de arquivo e mais
- ✅ **Regras Customizadas**: Crie suas próprias regras de validação
- ✅ **TypeScript**: Totalmente tipado para melhor DX
- ✅ **Mensagens User-Friendly**: Mensagens de erro claras e em português

## Uso Básico

```typescript
import { useFormValidation, validationRules } from "@/hooks/useFormValidation";

function MyForm() {
  const {
    formData,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    isValid,
  } = useFormValidation({
    schema: {
      email: {
        required: true,
        requiredMessage: "Email é obrigatório",
        rules: [validationRules.email],
      },
      password: {
        required: true,
        rules: [validationRules.minLength(8)],
      },
    },
    validateOn: "onBlur", // ou ['onChange', 'onBlur']
    initialValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data) => {
    console.log("Form data:", data);
    // Enviar para API
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <input
          name="email"
          value={formData.email || ""}
          onChange={(e) => handleChange("email", e.target.value)}
          onBlur={() => handleBlur("email")}
        />
        {touched.email && errors.email && (
          <span className="error">{errors.email}</span>
        )}
      </div>

      <div>
        <input
          name="password"
          type="password"
          value={formData.password || ""}
          onChange={(e) => handleChange("password", e.target.value)}
          onBlur={() => handleBlur("password")}
        />
        {touched.password && errors.password && (
          <span className="error">{errors.password}</span>
        )}
      </div>

      <button type="submit" disabled={!isValid}>
        Enviar
      </button>
    </form>
  );
}
```

## Regras de Validação Built-in

### Email

```typescript
validationRules.email;
// Valida formato de email
```

### CPF

```typescript
validationRules.cpf;
// Valida CPF com verificação de dígitos
```

### CNPJ

```typescript
validationRules.cnpj;
// Valida CNPJ com verificação de dígitos
```

### Telefone

```typescript
validationRules.phone;
// Valida telefone (10 ou 11 dígitos)
```

### Comprimento de String

```typescript
validationRules.minLength(8);
validationRules.maxLength(100);
```

### Valores Numéricos

```typescript
validationRules.min(18);
validationRules.max(120);
validationRules.numeric;
validationRules.alphanumeric;
```

### URL

```typescript
validationRules.url;
```

### Arquivos

```typescript
validationRules.fileSize(2); // Max 2MB
validationRules.fileType(["image/jpeg", "image/png", ".pdf"]);
```

### Regex Customizado

```typescript
validationRules.pattern(/^[A-Z]/, "Deve começar com letra maiúscula");
```

## Regras Customizadas

```typescript
const schema = {
  age: {
    required: true,
    rules: [
      {
        validate: (value) => value >= 18,
        message: "Você deve ter pelo menos 18 anos",
      },
      {
        validate: (value) => value <= 120,
        message: "Idade inválida",
      },
    ],
  },
  confirmPassword: {
    required: true,
    rules: [
      {
        validate: (value, formData) => value === formData.password,
        message: "As senhas não coincidem",
      },
    ],
  },
};
```

## Timing de Validação

### Validar no Blur (Recomendado)

```typescript
validateOn: "onBlur";
// Valida quando o usuário sai do campo
```

### Validar no Change

```typescript
validateOn: "onChange";
// Valida enquanto o usuário digita
```

### Validar no Submit

```typescript
validateOn: "onSubmit";
// Valida apenas ao submeter
```

### Múltiplos Timings

```typescript
validateOn: ["onBlur", "onSubmit"];
// Valida no blur e no submit
```

## API Completa

### Parâmetros

```typescript
{
  schema: ValidationSchema          // Esquema de validação
  validateOn?: ValidationTiming     // 'onChange' | 'onBlur' | 'onSubmit'
  initialValues?: Record<string, any> // Valores iniciais
}
```

### Retorno

```typescript
{
  formData: Record<string, any>           // Dados do formulário
  errors: ValidationErrors                 // Erros de validação
  touched: Record<string, boolean>         // Campos tocados
  handleChange: (field, value) => void     // Handler para onChange
  handleBlur: (field) => void              // Handler para onBlur
  handleSubmit: (callback) => (e) => void  // Handler para submit
  validateField: (field, value) => string | null  // Validar campo específico
  validateForm: () => boolean              // Validar formulário completo
  clearErrors: () => void                  // Limpar erros
  resetForm: () => void                    // Resetar formulário
  setFieldValue: (field, value) => void    // Setar valor manualmente
  setFieldError: (field, error) => void    // Setar erro manualmente
  isValid: boolean                         // Se formulário é válido
}
```

## Exemplos de Uso

### Formulário de Cadastro

```typescript
const schema = {
  name: {
    required: true,
    rules: [validationRules.minLength(3)],
  },
  email: {
    required: true,
    rules: [validationRules.email],
  },
  cpf: {
    required: true,
    rules: [validationRules.cpf],
  },
  phone: {
    required: true,
    rules: [validationRules.phone],
  },
};
```

### Upload de Arquivo

```typescript
const schema = {
  file: {
    required: true,
    requiredMessage: "Selecione um arquivo",
    rules: [
      validationRules.fileSize(5), // Max 5MB
      validationRules.fileType(["image/jpeg", "image/png", ".pdf"]),
    ],
  },
};
```

### Formulário de Evento (Compatível com useEventForm)

```typescript
const schema = {
  eventType: {
    required: true,
    requiredMessage: "Selecione um tipo de evento",
  },
  selectedProfessional: {
    required: true,
    requiredMessage: "Selecione um profissional",
  },
  date: {
    required: true,
    rules: [
      {
        validate: (value) => {
          const date = new Date(value);
          return date >= new Date();
        },
        message: "Data não pode ser no passado",
      },
    ],
  },
  startTime: {
    required: true,
    rules: [
      validationRules.pattern(
        /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
        "Horário inválido (HH:mm)"
      ),
    ],
  },
  endTime: {
    required: true,
    rules: [
      {
        validate: (value, formData) => {
          if (!formData.startTime) return true;
          return value > formData.startTime;
        },
        message: "Horário final deve ser após o horário inicial",
      },
    ],
  },
};
```

## Migração de Hooks Existentes

### Antes (useEventForm)

```typescript
const {
  formState,
  errors,
  handleFieldChange,
  handleSubmit
} = useEventForm({...})
```

### Depois (useFormValidation - Opcional)

```typescript
const { formData, errors, handleChange, handleSubmit } = useFormValidation({
  schema: eventValidationSchema,
  validateOn: "onBlur",
});
```

**Nota**: O `useEventForm` continua válido para formulários de eventos com validação de sobreposição. O `useFormValidation` é recomendado para novos formulários mais simples.

## Boas Práticas

1. **Use `onBlur` para melhor UX**: Não mostre erros enquanto usuário digita
2. **Sempre mostre erros apenas se campo foi tocado**: Use `touched[field]`
3. **Desabilite botão de submit se formulário inválido**: Use `isValid`
4. **Forneça mensagens claras**: Use mensagens em português e específicas
5. **Valide no cliente e no servidor**: Validação no cliente é UX, no servidor é segurança

## Integração com Componentes UI

```typescript
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function FormField({ name, label, type = "text", validation }) {
  const { formData, errors, touched, handleChange, handleBlur } = validation;

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        value={formData[name] || ""}
        onChange={(e) => handleChange(name, e.target.value)}
        onBlur={() => handleBlur(name)}
        className={touched[name] && errors[name] ? "border-red-500" : ""}
      />
      {touched[name] && errors[name] && (
        <p className="text-sm text-red-500">{errors[name]}</p>
      )}
    </div>
  );
}
```

## Conclusão

O hook `useFormValidation` padroniza a validação de formulários na aplicação, garantindo:

- ✅ Consistência nas mensagens de erro
- ✅ Timing de validação previsível
- ✅ Código mais limpo e reutilizável
- ✅ Melhor experiência do usuário

Use-o em todos os novos formulários para manter a qualidade e consistência da aplicação.
