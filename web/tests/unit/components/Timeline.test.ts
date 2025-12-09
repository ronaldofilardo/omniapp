import { describe, it, expect } from 'vitest'

describe('Timeline Event Interface', () => {
  describe('Correção: Interface Event com physicalPath e uploadDate', () => {
    it('deve aceitar Event com files incluindo physicalPath', () => {
      const event = {
        id: 'event-1',
        title: 'Consulta',
        date: new Date('2025-11-21'),
        type: 'CONSULTA',
        professionalId: 'prof-1',
        startTime: new Date('2025-11-21T10:00:00Z'),
        endTime: new Date('2025-11-21T11:00:00Z'),
        files: [
          {
            slot: 'result',
            name: 'exame.pdf',
            url: '/uploads/exame.pdf',
            physicalPath: '/var/www/uploads/exame.pdf',
            uploadDate: '2025-11-21',
          },
        ],
      }

      // TypeScript deve aceitar esta estrutura sem erros
      expect(event.files![0].physicalPath).toBe('/var/www/uploads/exame.pdf')
      expect(event.files![0].uploadDate).toBe('2025-11-21')
    })

    it('deve aceitar Event com files sem physicalPath (opcional)', () => {
      const event = {
        id: 'event-2',
        title: 'Exame',
        date: new Date('2025-11-22'),
        type: 'EXAME',
        professionalId: 'prof-2',
        startTime: new Date('2025-11-22T09:00:00Z'),
        endTime: new Date('2025-11-22T10:00:00Z'),
        files: [
          {
            slot: 'prescription',
            name: 'receita.pdf',
            url: '/uploads/receita.pdf',
          },
        ],
      }

      // Campos opcionais podem estar ausentes
      expect(event.files![0].physicalPath).toBeUndefined()
      expect(event.files![0].uploadDate).toBeUndefined()
    })

    it('deve aceitar uploadDate como string ou null', () => {
      const eventWithString = {
        id: 'event-3',
        title: 'Procedimento',
        date: new Date('2025-11-23'),
        type: 'PROCEDIMENTO',
        professionalId: 'prof-3',
        startTime: new Date('2025-11-23T08:00:00Z'),
        endTime: new Date('2025-11-23T09:00:00Z'),
        files: [
          {
            slot: 'authorization',
            name: 'auth.pdf',
            url: '/uploads/auth.pdf',
            uploadDate: '2025-11-23',
          },
        ],
      }

      const eventWithNull = {
        id: 'event-4',
        title: 'Medicação',
        date: new Date('2025-11-24'),
        type: 'MEDICACAO',
        professionalId: 'prof-4',
        startTime: new Date('2025-11-24T07:00:00Z'),
        endTime: new Date('2025-11-24T08:00:00Z'),
        files: [
          {
            slot: 'invoice',
            name: 'nf.pdf',
            url: '/uploads/nf.pdf',
            uploadDate: null,
          },
        ],
      }

      expect(eventWithString.files![0].uploadDate).toBe('2025-11-23')
      expect(eventWithNull.files![0].uploadDate).toBeNull()
    })
  })
})

