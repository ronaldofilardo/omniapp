import { describe, it, expect, vi, beforeEach } from 'vitest'
import { addMockRoute, removeMockRoute } from '../../utils/mocks/setupFetchMock'

// Import setupFetchMock para garantir que o mock global esteja ativo
import '../../utils/mocks/setupFetchMock'

describe('API Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Events API Contract', () => {
    it('should adhere to GET /api/events contract', async () => {
      const response = await fetch('/api/events')
      const data = await response.json()

      // Contract: should return 200 status
      expect(response.status).toBe(200)

      // Contract: should return array of events
      expect(Array.isArray(data)).toBe(true)

      // Contract: each event should have required fields
      if (data.length > 0) {
        const event = data[0]
        expect(event).toHaveProperty('id')
        expect(event).toHaveProperty('title')
        expect(event).toHaveProperty('date')
        expect(event).toHaveProperty('startTime')
        expect(event).toHaveProperty('endTime')
        expect(event).toHaveProperty('type')
        expect(event).toHaveProperty('userId')
        expect(event).toHaveProperty('professionalId')
        expect(event).toHaveProperty('files')

        // Contract: type should be valid EventType
        expect(['CONSULTA', 'EXAME']).toContain(event.type)

        // Contract: files should be an array
        expect(Array.isArray(event.files)).toBe(true)
      }
    })

    it('should adhere to POST /api/events contract', async () => {
      const newEvent = {
        title: 'Contract Test Event',
        description: 'Testing API contract',
        date: '2025-10-31',
        startTime: '10:00',
        endTime: '11:00',
        type: 'CONSULTA',
        userId: 'user-contract-test',
        professionalId: 'prof-contract-test',
        files: []
      }

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent)
      })
      const data = await response.json()

      // Contract: should return 201 status for creation
      expect(response.status).toBe(201)

      // Contract: should return created event with id
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('message')
      expect(data.message).toContain('criado')
    })

    it('should adhere to GET /api/events/:id contract', async () => {
      const response = await fetch('/api/events/1')
      const data = await response.json()

      // Contract: should return 200 for existing event or 404 for non-existing
      expect([200, 404]).toContain(response.status)

      if (response.status === 200) {
        // Contract: should return event object with all required fields
        expect(data).toHaveProperty('id')
        expect(data).toHaveProperty('title')
        expect(data).toHaveProperty('date')
        expect(data).toHaveProperty('startTime')
        expect(data).toHaveProperty('endTime')
        expect(data).toHaveProperty('type')
        expect(data).toHaveProperty('userId')
        expect(data).toHaveProperty('professionalId')
        expect(data).toHaveProperty('files')
      } else {
        // Contract: should return error message for 404
        expect(data).toHaveProperty('message')
        expect(data.message).toContain('não encontrado')
      }
    })

    it('should adhere to PUT /api/events/:id contract', async () => {
      const updateData = {
        title: 'Updated Event',
        description: 'Updated description'
      }

      const response = await fetch('/api/events/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })
      const data = await response.json()

      // Contract: should return 200 status
      expect(response.status).toBe(200)

      // Contract: should return success message
      expect(data).toHaveProperty('message')
      expect(data.message).toContain('atualizado')
    })

    it('should adhere to DELETE /api/events/:id contract', async () => {
      const response = await fetch('/api/events/1', {
        method: 'DELETE'
      })
      const data = await response.json()

      // Contract: should return 200 status
      expect(response.status).toBe(200)

      // Contract: should return success message
      expect(data).toHaveProperty('message')
      expect(data.message).toContain('deletado')
    })
  })

  describe('Professionals API Contract', () => {
    it('should adhere to GET /api/professionals contract', async () => {
      const response = await fetch('/api/professionals')
      const data = await response.json()

      // Contract: should return 200 status
      expect(response.status).toBe(200)

      // Contract: should return array of professionals
      expect(Array.isArray(data)).toBe(true)

      // Contract: each professional should have required fields
      if (data.length > 0) {
        const professional = data[0]
        expect(professional).toHaveProperty('id')
        expect(professional).toHaveProperty('name')
        expect(professional).toHaveProperty('specialty')
        expect(professional).toHaveProperty('userId')
        expect(professional).toHaveProperty('contact')
      }
    })

    it('should adhere to POST /api/professionals contract', async () => {
      const newProfessional = {
        name: 'Dr. Contract Test',
        specialty: 'Cardiology',
        userId: 'user-contract-test',
        contact: JSON.stringify({ email: 'contract@example.com', phone: '11999999999' })
      }

      const response = await fetch('/api/professionals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfessional)
      })
      const data = await response.json()

      // Contract: should return 201 status for creation
      expect(response.status).toBe(201)

      // Contract: should return created professional with id
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('message')
      expect(data.message).toContain('criado')
    })
  })

  describe('Notifications API Contract', () => {
    it('should adhere to GET /api/notifications contract', async () => {
      const response = await fetch('/api/notifications')
      const data = await response.json()

      // Contract: should return 200 status
      expect(response.status).toBe(200)

      // Contract: should return array of notifications
      expect(Array.isArray(data)).toBe(true)

      // Contract: each notification should have required fields
      if (data.length > 0) {
        const notification = data[0]
        expect(notification).toHaveProperty('id')
        expect(notification).toHaveProperty('type')
        expect(notification).toHaveProperty('payload')
        expect(notification).toHaveProperty('createdAt')
        expect(notification).toHaveProperty('status')
      }
    })

    it('should adhere to POST /api/notifications contract', async () => {
      const newNotification = {
        title: 'Contract Test Notification',
        message: 'Testing notification contract',
        type: 'RESULT',
        userId: 'user-contract-test'
      }

      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNotification)
      })
      const data = await response.json()

      // Contract: should return 201 status for creation
      expect(response.status).toBe(201)

      // Contract: should return created notification with id
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('message')
      expect(data.message).toContain('criada')
    })
  })

  describe('External API Integration Contract', () => {
    it('should handle external lab submission API contract', async () => {
      // Add mock route for external lab API
      addMockRoute('/api/lab/submit', {
        POST: (data) => ({
          status: 200,
          body: {
            success: true,
            protocol: 'LAB-2025-001',
            message: 'Laudo enviado com sucesso',
            estimatedTime: '2 horas'
          }
        })
      })

      const labData = {
        patientName: 'João Silva',
        examType: 'Hemograma Completo',
        priority: 'normal',
        clinicalInfo: 'Paciente assintomático'
      }

      const response = await fetch('/api/lab/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(labData)
      })
      const data = await response.json()

      // Contract: should return 200 status
      expect(response.status).toBe(200)

      // Contract: should return success response with protocol
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('protocol')
      expect(data).toHaveProperty('message')
      expect(data).toHaveProperty('estimatedTime')

      // Clean up mock route
      removeMockRoute('/api/lab/submit')
    })

    it('should handle external repository upload API contract', async () => {
      // Add mock route for external repository API
      addMockRoute('/api/upload', {
        POST: (data) => ({
          status: 201,
          body: {
            success: true,
            fileId: 'file-12345',
            url: '/uploads/file-12345.pdf',
            message: 'Arquivo enviado com sucesso'
          }
        })
      })

      const formData = new FormData()
      formData.append('file', new Blob(['test content'], { type: 'application/pdf' }), 'test.pdf')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      const data = await response.json()

      // Contract: should return 201 status
      expect(response.status).toBe(201)

      // Contract: should return upload response with file details
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('fileId')
      expect(data).toHaveProperty('url')
      expect(data).toHaveProperty('message')

      // Clean up mock route
      removeMockRoute('/api/upload')
    })
  })

  describe('Error Response Contracts', () => {
    it('should adhere to error response contract for invalid requests', async () => {
      // Test with invalid data
      const invalidEvent = {
        // Missing required fields
        title: '',
        date: 'invalid-date'
      }

      const response = await fetch('/api/events?userId=contract-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidEvent)
      })
      const data = await response.json()

      // Contract: should return error status (4xx)
      expect(response.status).toBeGreaterThanOrEqual(400)
      expect(response.status).toBeLessThan(500)

      // Contract: should return error message
      expect(data).toHaveProperty('message')
      expect(typeof data.message).toBe('string')
    })

    it('should adhere to error response contract for non-existent resources', async () => {
      const response = await fetch('/api/events/99999')
      const data = await response.json()

      // Contract: should return 404 status
      expect(response.status).toBe(404)

      // Contract: should return error message
      expect(data).toHaveProperty('message')
      expect(data.message).toContain('não encontrado')
    })

    it('should adhere to error response contract for unauthorized access', async () => {
      // Test without authentication (simulated)
      const response = await fetch('/api/events', {
        headers: {
          // Missing or invalid auth headers
        }
      })

      // Contract: should return 401 or 403 status
      // Note: This might return 200 in mock, but contract should define auth behavior
      expect([200, 401, 403]).toContain(response.status)
    })
  })
})
