/**
 * Setup específico para testes de contrato de API
 * Configurações e utilitários para validação de contratos
 */

import { vi, beforeAll, afterAll } from 'vitest'
import { addMockRoute, removeMockRoute } from '../utils/mocks/setupFetchMock'

// Tipos para contratos de API
export interface APIContract {
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  requestSchema?: any
  responseSchema: any
  statusCode: number
  description?: string
}

export interface ContractValidationResult {
  endpoint: string
  method: string
  passed: boolean
  errors: string[]
  responseTime?: number
}

// Validador de contratos
export class ContractValidator {
  private static instance: ContractValidator
  private contracts: APIContract[] = []
  private validationResults: ContractValidationResult[] = []

  static getInstance(): ContractValidator {
    if (!ContractValidator.instance) {
      ContractValidator.instance = new ContractValidator()
    }
    return ContractValidator.instance
  }

  registerContract(contract: APIContract): void {
    this.contracts.push(contract)
  }

  async validateContract(contract: APIContract): Promise<ContractValidationResult> {
    const errors: string[] = []
    const startTime = performance.now()

    try {
      // Prepare request
      const requestOptions: RequestInit = {
        method: contract.method,
        headers: { 'Content-Type': 'application/json' }
      }

      if (contract.requestSchema && ['POST', 'PUT', 'PATCH'].includes(contract.method)) {
        requestOptions.body = JSON.stringify(contract.requestSchema)
      }

      // Make request
      const response = await fetch(contract.endpoint, requestOptions)
      const endTime = performance.now()
      const responseTime = endTime - startTime

      // Validate status code
      if (response.status !== contract.statusCode) {
        errors.push(`Expected status ${contract.statusCode}, got ${response.status}`)
      }

      // Validate response structure
      const responseData = await response.json()
      const schemaErrors = this.validateSchema(responseData, contract.responseSchema)
      errors.push(...schemaErrors)

      const result: ContractValidationResult = {
        endpoint: contract.endpoint,
        method: contract.method,
        passed: errors.length === 0,
        errors,
        responseTime
      }

      this.validationResults.push(result)
      return result

    } catch (error) {
      errors.push(`Request failed: ${error instanceof Error ? error.message : String(error)}`)
      return {
        endpoint: contract.endpoint,
        method: contract.method,
        passed: false,
        errors
      }
    }
  }

  private validateSchema(data: any, schema: any): string[] {
    const errors: string[] = []

    if (!data && schema) {
      errors.push('Response data is null/undefined but schema expects data')
      return errors
    }

    if (typeof schema === 'object' && schema !== null) {
      for (const [key, expectedType] of Object.entries(schema)) {
        if (!(key in data)) {
          errors.push(`Missing required property: ${key}`)
          continue
        }

        const actualValue = data[key]
        const actualType = typeof actualValue

        if (expectedType === 'array') {
          if (!Array.isArray(actualValue)) {
            errors.push(`Property ${key}: expected array, got ${actualType}`)
          }
        } else if (expectedType === 'object') {
          if (actualType !== 'object' || Array.isArray(actualValue)) {
            errors.push(`Property ${key}: expected object, got ${actualType}`)
          }
        } else if (typeof expectedType === 'string') {
          if (actualType !== expectedType) {
            errors.push(`Property ${key}: expected ${expectedType}, got ${actualType}`)
          }
        }
      }
    }

    return errors
  }

  async validateAllContracts(): Promise<ContractValidationResult[]> {
    const results: ContractValidationResult[] = []

    for (const contract of this.contracts) {
      const result = await this.validateContract(contract)
      results.push(result)
    }

    return results
  }

  getValidationResults(): ContractValidationResult[] {
    return this.validationResults
  }

  generateReport(): {
    total: number
    passed: number
    failed: number
    averageResponseTime: number
    results: ContractValidationResult[]
  } {
    const total = this.validationResults.length
    const passed = this.validationResults.filter(r => r.passed).length
    const failed = total - passed

    const responseTimes = this.validationResults
      .filter(r => r.responseTime !== undefined)
      .map(r => r.responseTime!)

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0

    return {
      total,
      passed,
      failed,
      averageResponseTime,
      results: this.validationResults
    }
  }

  clearResults(): void {
    this.validationResults = []
  }
}

// Contratos de API padrão
export const DEFAULT_API_CONTRACTS: APIContract[] = [
  {
    endpoint: '/api/events',
    method: 'GET',
    responseSchema: {
      length: 'number' // Array check
    },
    statusCode: 200,
    description: 'List all events'
  },
  {
    endpoint: '/api/events',
    method: 'POST',
    requestSchema: {
      title: 'Test Event',
      date: '2025-10-31',
      startTime: '10:00',
      endTime: '11:00',
      type: 'CONSULTA',
      userId: 'user-1',
      professionalId: 'prof-1'
    },
    responseSchema: {
      id: 'string',
      message: 'string'
    },
    statusCode: 201,
    description: 'Create new event'
  },
  {
    endpoint: '/api/professionals',
    method: 'GET',
    responseSchema: {
      length: 'number' // Array check
    },
    statusCode: 200,
    description: 'List all professionals'
  },
  {
    endpoint: '/api/professionals',
    method: 'POST',
    requestSchema: {
      name: 'Dr. Test',
      specialty: 'Cardiology',
      userId: 'user-1'
    },
    responseSchema: {
      id: 'string',
      message: 'string'
    },
    statusCode: 201,
    description: 'Create new professional'
  },
  {
    endpoint: '/api/notifications',
    method: 'GET',
    responseSchema: {
      length: 'number' // Array check
    },
    statusCode: 200,
    description: 'List all notifications'
  }
]

// Setup global para testes de contrato
beforeAll(() => {
  // Registra contratos padrão
  const validator = ContractValidator.getInstance()
  DEFAULT_API_CONTRACTS.forEach(contract => {
    validator.registerContract(contract)
  })
})

afterAll(() => {
  // Limpa resultados após todos os testes
  ContractValidator.getInstance().clearResults()
})

// Exporta instância global do validador
export const contractValidator = ContractValidator.getInstance()

// Utilitários para testes de contrato
export function assertContractCompliance(result: ContractValidationResult): void {
  if (!result.passed) {
    throw new Error(
      `Contract validation failed for ${result.method} ${result.endpoint}:\n` +
      result.errors.map(error => `  - ${error}`).join('\n')
    )
  }
}

export function assertResponseTime(result: ContractValidationResult, maxTime: number): void {
  if (result.responseTime && result.responseTime > maxTime) {
    throw new Error(
      `Response time exceeded for ${result.method} ${result.endpoint}: ` +
      `expected <= ${maxTime}ms, got ${result.responseTime.toFixed(2)}ms`
    )
  }
}
