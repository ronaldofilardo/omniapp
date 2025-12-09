import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createProfessionalServiceMock, clearAllMocks } from './__mocks__/services'
import { mockProfessionals } from '../web/tests/utils/mocks/mockData'

// Mock centralizado do professionalService
let professionalService: ReturnType<typeof createProfessionalServiceMock>

describe('Professional Service Tests', () => {
  beforeEach(() => {
    // Criar nova instância do mock antes de cada teste
    professionalService = createProfessionalServiceMock()
    clearAllMocks({ professionalService })
  })

  it('should return a list of professionals', () => {
    const result = professionalService.getProfessionals()
    expect(Array.isArray(result)).toBe(true)
    expect(professionalService.getProfessionals).toHaveBeenCalled()
  })

  it('should add a new professional', () => {
    const newProfessional = { name: 'John Doe', specialty: 'Developer' }
    const result = professionalService.addProfessional(newProfessional)
    expect(result.name).toBe(newProfessional.name)
    expect(result.id).toBeDefined()
    expect(professionalService.addProfessional).toHaveBeenCalledWith(newProfessional)
  })

  it('should update a professional', () => {
    // Adicionar profissional primeiro
    const professional = professionalService.addProfessional({ name: 'John Doe', specialty: 'Developer' })
    
    const updatedProfessional = { id: professional.id, name: 'Jane Doe', specialty: 'Designer' }
    const result = professionalService.updateProfessional(updatedProfessional)
    expect(result.id).toBe(updatedProfessional.id)
    expect(result.name).toBe(updatedProfessional.name)
  })

  it('should delete a professional', () => {
    // Adicionar profissional primeiro
    const professional = professionalService.addProfessional({ name: 'John Doe', specialty: 'Developer' })
    
    const result = professionalService.deleteProfessional(professional.id)
    expect(result).toBe(true)
    expect(professionalService.deleteProfessional).toHaveBeenCalledWith(professional.id)
  })

  it('should return false when trying to delete non-existent professional', () => {
    const result = professionalService.deleteProfessional('non-existent-id')
    expect(result).toBe(false)
  })

  it('should get professional by id', () => {
    const professional = professionalService.addProfessional({ name: 'John Doe', specialty: 'Developer' })
    
    const found = professionalService.getProfessionalById(professional.id)
    expect(found).toEqual(professional)
    expect(professionalService.getProfessionalById).toHaveBeenCalledWith(professional.id)
  })
})
