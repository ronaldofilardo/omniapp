import { useState, useCallback, useMemo } from 'react'

// ============================================================================
// TYPES
// ============================================================================

export type ValidationRule<T> = {
  validate: (value: T, formData?: Record<string, any>) => boolean
  message: string
}

export type FieldValidation<T = any> = {
  required?: boolean
  requiredMessage?: string
  rules?: ValidationRule<T>[]
}

export type ValidationSchema = Record<string, FieldValidation>

export type ValidationErrors = Record<string, string>

export type ValidationTiming = 'onChange' | 'onBlur' | 'onSubmit'

export type UseFormValidationOptions = {
  schema: ValidationSchema
  validateOn?: ValidationTiming | ValidationTiming[]
  initialValues?: Record<string, any>
}

// ============================================================================
// BUILT-IN VALIDATION RULES
// ============================================================================

export const validationRules = {
  email: {
    validate: (value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(value)
    },
    message: 'Email inválido'
  },
  
  minLength: (length: number) => ({
    validate: (value: string) => value.length >= length,
    message: `Deve ter no mínimo ${length} caracteres`
  }),
  
  maxLength: (length: number) => ({
    validate: (value: string) => value.length <= length,
    message: `Deve ter no máximo ${length} caracteres`
  }),
  
  pattern: (regex: RegExp, message: string) => ({
    validate: (value: string) => regex.test(value),
    message
  }),
  
  cpf: {
    validate: (value: string) => {
      const cpf = value.replace(/\D/g, '')
      if (cpf.length !== 11) return false
      
      // Validação básica de CPF
      if (/^(\d)\1{10}$/.test(cpf)) return false
      
      let sum = 0
      for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i)
      }
      let digit = 11 - (sum % 11)
      if (digit >= 10) digit = 0
      if (digit !== parseInt(cpf.charAt(9))) return false
      
      sum = 0
      for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i)
      }
      digit = 11 - (sum % 11)
      if (digit >= 10) digit = 0
      return digit === parseInt(cpf.charAt(10))
    },
    message: 'CPF inválido'
  },
  
  cnpj: {
    validate: (value: string) => {
      const cnpj = value.replace(/\D/g, '')
      if (cnpj.length !== 14) return false
      
      // Validação básica de CNPJ
      if (/^(\d)\1{13}$/.test(cnpj)) return false
      
      let size = cnpj.length - 2
      let numbers = cnpj.substring(0, size)
      const digits = cnpj.substring(size)
      let sum = 0
      let pos = size - 7
      
      for (let i = size; i >= 1; i--) {
        sum += parseInt(numbers.charAt(size - i)) * pos--
        if (pos < 2) pos = 9
      }
      
      let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
      if (result !== parseInt(digits.charAt(0))) return false
      
      size = size + 1
      numbers = cnpj.substring(0, size)
      sum = 0
      pos = size - 7
      
      for (let i = size; i >= 1; i--) {
        sum += parseInt(numbers.charAt(size - i)) * pos--
        if (pos < 2) pos = 9
      }
      
      result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
      return result === parseInt(digits.charAt(1))
    },
    message: 'CNPJ inválido'
  },
  
  phone: {
    validate: (value: string) => {
      const phone = value.replace(/\D/g, '')
      return phone.length >= 10 && phone.length <= 11
    },
    message: 'Telefone inválido'
  },
  
  url: {
    validate: (value: string) => {
      try {
        new URL(value)
        return true
      } catch {
        return false
      }
    },
    message: 'URL inválida'
  },
  
  numeric: {
    validate: (value: string) => /^\d+$/.test(value),
    message: 'Deve conter apenas números'
  },
  
  alphanumeric: {
    validate: (value: string) => /^[a-zA-Z0-9]+$/.test(value),
    message: 'Deve conter apenas letras e números'
  },
  
  min: (minValue: number) => ({
    validate: (value: number) => value >= minValue,
    message: `Deve ser no mínimo ${minValue}`
  }),
  
  max: (maxValue: number) => ({
    validate: (value: number) => value <= maxValue,
    message: `Deve ser no máximo ${maxValue}`
  }),
  
  fileSize: (maxSizeMB: number) => ({
    validate: (file: File) => {
      if (!file) return true
      return file.size <= maxSizeMB * 1024 * 1024
    },
    message: `Arquivo deve ter no máximo ${maxSizeMB}MB`
  }),
  
  fileType: (allowedTypes: string[]) => ({
    validate: (file: File) => {
      if (!file) return true
      return allowedTypes.some(type => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase())
        }
        return file.type.startsWith(type)
      })
    },
    message: `Tipo de arquivo inválido. Permitidos: ${allowedTypes.join(', ')}`
  })
}

// ============================================================================
// HOOK
// ============================================================================

export function useFormValidation({
  schema,
  validateOn = 'onSubmit',
  initialValues = {}
}: UseFormValidationOptions) {
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [formData, setFormData] = useState<Record<string, any>>(initialValues)
  
  const validateOnArray = useMemo(() => 
    Array.isArray(validateOn) ? validateOn : [validateOn],
    [validateOn]
  )
  
  // Validar um campo específico
  const validateField = useCallback((fieldName: string, value: any): string | null => {
    const fieldSchema = schema[fieldName]
    if (!fieldSchema) return null
    
    // Verificar required
    if (fieldSchema.required) {
      if (value === undefined || value === null || value === '') {
        return fieldSchema.requiredMessage || 'Campo obrigatório'
      }
    }
    
    // Se não é required e está vazio, não validar outras regras
    if (!fieldSchema.required && (value === undefined || value === null || value === '')) {
      return null
    }
    
    // Validar regras customizadas
    if (fieldSchema.rules) {
      for (const rule of fieldSchema.rules) {
        if (!rule.validate(value, formData)) {
          return rule.message
        }
      }
    }
    
    return null
  }, [schema, formData])
  
  // Validar todos os campos
  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationErrors = {}
    
    Object.keys(schema).forEach(fieldName => {
      const error = validateField(fieldName, formData[fieldName])
      if (error) {
        newErrors[fieldName] = error
      }
    })
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [schema, formData, validateField])
  
  // Handler para onChange
  const handleChange = useCallback((fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }))
    
    if (validateOnArray.includes('onChange')) {
      const error = validateField(fieldName, value)
      setErrors(prev => {
        const newErrors = { ...prev }
        if (error) {
          newErrors[fieldName] = error
        } else {
          delete newErrors[fieldName]
        }
        return newErrors
      })
    }
  }, [validateOnArray, validateField])
  
  // Handler para onBlur
  const handleBlur = useCallback((fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }))
    
    if (validateOnArray.includes('onBlur')) {
      const error = validateField(fieldName, formData[fieldName])
      setErrors(prev => {
        const newErrors = { ...prev }
        if (error) {
          newErrors[fieldName] = error
        } else {
          delete newErrors[fieldName]
        }
        return newErrors
      })
    }
  }, [validateOnArray, validateField, formData])
  
  // Handler para submit
  const handleSubmit = useCallback((callback: (data: Record<string, any>) => void | Promise<void>) => {
    return async (e: React.FormEvent) => {
      e.preventDefault()
      
      // Marcar todos os campos como touched
      const allTouched = Object.keys(schema).reduce((acc, key) => {
        acc[key] = true
        return acc
      }, {} as Record<string, boolean>)
      setTouched(allTouched)
      
      if (validateForm()) {
        await callback(formData)
      }
    }
  }, [schema, validateForm, formData])
  
  // Limpar erros
  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])
  
  // Resetar formulário
  const resetForm = useCallback(() => {
    setFormData(initialValues)
    setErrors({})
    setTouched({})
  }, [initialValues])
  
  // Setar valores
  const setFieldValue = useCallback((fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }))
  }, [])
  
  // Setar erro manualmente
  const setFieldError = useCallback((fieldName: string, error: string) => {
    setErrors(prev => ({ ...prev, [fieldName]: error }))
  }, [])
  
  return {
    formData,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    validateField,
    validateForm,
    clearErrors,
    resetForm,
    setFieldValue,
    setFieldError,
    isValid: Object.keys(errors).length === 0
  }
}
