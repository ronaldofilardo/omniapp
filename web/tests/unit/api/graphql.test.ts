import { POST, GET } from '@/app/api/graphql/route';
import { vi } from 'vitest';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    professional: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    healthEvent: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';

describe('/api/graphql', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET method', () => {
    it('should return GraphQL API information', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('GraphQL API - Use POST para consultas');
      expect(data.endpoint).toBe('/api/graphql');
      expect(data.example).toBeDefined();
      expect(data.example.query).toContain('professionals');
      expect(data.example.query).toContain('events');
    });
  });

  describe('POST method', () => {
    it('should execute professionals query successfully', async () => {
      const mockUser = { id: 'user-1', email: 'user@email.com' };
      const mockProfessionals = [
        { id: 'prof-1', name: 'Dr. João Silva', specialty: 'Cardiologia' },
        { id: 'prof-2', name: 'Dra. Maria Santos', specialty: 'Dermatologia' },
      ];

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.professional.findMany as any).mockResolvedValue(mockProfessionals);

      const request = new Request('http://localhost:3000/api/graphql', {
        method: 'POST',
        body: JSON.stringify({
          query: `
            query {
              professionals {
                id
                name
                specialty
              }
            }
          `,
        }),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.professionals).toEqual(mockProfessionals);
      expect(data.errors).toBeUndefined();

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@email.com' },
      });
      expect(prisma.professional.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should execute events query successfully', async () => {
      const mockUser = { id: 'user-1', email: 'user@email.com' };
      const mockEvents = [
        {
          id: 'event-1',
          title: 'Consulta Médica',
          description: 'Consulta de rotina',
          date: '2024-10-25',
          type: 'consulta',
          startTime: '10:00',
          endTime: '11:00',
          professional: { id: 'prof-1', name: 'Dr. João Silva', specialty: 'Cardiologia' },
        },
      ];

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.healthEvent.findMany as any).mockResolvedValue(mockEvents);

      const request = new Request('http://localhost:3000/api/graphql', {
        method: 'POST',
        body: JSON.stringify({
          query: `
            query {
              events {
                id
                title
                description
                date
                type
                startTime
                endTime
                professional {
                  id
                  name
                  specialty
                }
              }
            }
          `,
        }),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.events).toEqual(mockEvents);
      expect(prisma.healthEvent.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { professional: true },
      });
    });

    it('should execute event query by id', async () => {
      const mockEvent = {
        id: 'event-1',
        title: 'Consulta Médica',
        description: 'Consulta de rotina',
        date: '2024-10-25',
        type: 'consulta',
        startTime: '10:00',
        endTime: '11:00',
        professional: { id: 'prof-1', name: 'Dr. João Silva', specialty: 'Cardiologia' },
      };

      (prisma.healthEvent.findUnique as any).mockResolvedValue(mockEvent);

      const request = new Request('http://localhost:3000/api/graphql', {
        method: 'POST',
        body: JSON.stringify({
          query: `
            query GetEvent($id: ID!) {
              event(id: $id) {
                id
                title
                description
                date
                type
                startTime
                endTime
                professional {
                  id
                  name
                  specialty
                }
              }
            }
          `,
          variables: { id: 'event-1' },
        }),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.event).toEqual(mockEvent);
      expect(prisma.healthEvent.findUnique).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        include: { professional: true },
      });
    });

    it('should execute professional query by id', async () => {
      const mockProfessional = {
        id: 'prof-1',
        name: 'Dr. João Silva',
        specialty: 'Cardiologia',
        address: 'Rua A, 123',
        contact: '(11) 99999-9999',
      };

      (prisma.professional.findUnique as any).mockResolvedValue(mockProfessional);

      const request = new Request('http://localhost:3000/api/graphql', {
        method: 'POST',
        body: JSON.stringify({
          query: `
            query GetProfessional($id: ID!) {
              professional(id: $id) {
                id
                name
                specialty
                address
                contact
              }
            }
          `,
          variables: { id: 'prof-1' },
        }),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.professional).toEqual(mockProfessional);
      expect(prisma.professional.findUnique).toHaveBeenCalledWith({
        where: { id: 'prof-1' },
      });
    });

    it('should execute createEvent mutation', async () => {
      const mockUser = { id: 'user-1', email: 'user@email.com' };
      const mockEvent = {
        id: 'event-1',
        title: 'Nova Consulta',
        description: 'Consulta de acompanhamento',
        date: '2024-10-26',
        type: 'consulta',
        startTime: '14:00',
        endTime: '15:00',
        professional: { id: 'prof-1', name: 'Dr. João Silva', specialty: 'Cardiologia' },
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.healthEvent.create as any).mockResolvedValue(mockEvent);

      const request = new Request('http://localhost:3000/api/graphql', {
        method: 'POST',
        body: JSON.stringify({
          query: `
            mutation {
              createEvent(
                title: "Nova Consulta"
                description: "Consulta de acompanhamento"
                date: "2024-10-26"
                type: "consulta"
                startTime: "14:00"
                endTime: "15:00"
                professionalId: "prof-1"
              ) {
                id
                title
                description
                date
                type
                startTime
                endTime
                professional {
                  id
                  name
                  specialty
                }
              }
            }
          `,
        }),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.createEvent).toEqual(mockEvent);
      expect(prisma.healthEvent.create).toHaveBeenCalledWith({
        data: {
          title: 'Nova Consulta',
          description: 'Consulta de acompanhamento',
          date: '2024-10-26',
          type: 'consulta',
          startTime: '14:00',
          endTime: '15:00',
          professionalId: 'prof-1',
          userId: 'user-1',
        },
        include: { professional: true },
      });
    });

    it('should return empty arrays when user not found', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/graphql', {
        method: 'POST',
        body: JSON.stringify({
          query: `
            query {
              professionals {
                id
                name
              }
              events {
                id
                title
              }
            }
          `,
        }),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.professionals).toEqual([]);
      expect(data.data.events).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      (prisma.user.findUnique as any).mockRejectedValue(new Error('Database connection failed'));

      const request = new Request('http://localhost:3000/api/graphql', {
        method: 'POST',
        body: JSON.stringify({
          query: `
            query {
              professionals {
                id
                name
              }
            }
          `,
        }),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.professionals).toEqual([]);
    });

    it('should handle GraphQL syntax errors', async () => {
      const request = new Request('http://localhost:3000/api/graphql', {
        method: 'POST',
        body: JSON.stringify({
          query: 'invalid graphql query {',
        }),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.errors).toBeDefined();
      expect(data.errors.length).toBeGreaterThan(0);
    });

    it('should handle invalid JSON in request', async () => {
      const request = new Request('http://localhost:3000/api/graphql', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Erro interno do servidor GraphQL');
    });

    it('should handle createEvent mutation errors', async () => {
      const mockUser = { id: 'user-1', email: 'user@email.com' };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.healthEvent.create as any).mockRejectedValue(new Error('Validation failed'));

      const request = new Request('http://localhost:3000/api/graphql', {
        method: 'POST',
        body: JSON.stringify({
          query: `
            mutation {
              createEvent(
                title: "Test Event"
                date: "2024-10-25"
                type: "consulta"
                startTime: "10:00"
                endTime: "11:00"
                professionalId: "prof-1"
              ) {
                id
              }
            }
          `,
        }),
        headers: {
          'content-type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.errors).toBeDefined();
      expect(data.errors[0].message).toContain('Validation failed');
    });
  });
});
