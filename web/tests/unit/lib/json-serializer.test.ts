import { describe, it, expect } from 'vitest';
import { serializePrismaObject, createJsonResponse } from '@/lib/json-serializer';

// Mock do NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn(),
  },
}));

import { NextResponse } from 'next/server';

describe('json-serializer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('serializePrismaObject', () => {
    it('deve retornar null quando objeto é null', () => {
      const result = serializePrismaObject(null);
      expect(result).toBeNull();
    });

    it('deve retornar undefined quando objeto é undefined', () => {
      const result = serializePrismaObject(undefined);
      expect(result).toBeUndefined();
    });

    it('deve converter Date para string ISO', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const result = serializePrismaObject(date);
      expect(result).toBe('2024-01-15T10:30:00.000Z');
    });

    it('deve converter BigInt para string', () => {
      const bigInt = BigInt('12345678901234567890');
      const result = serializePrismaObject(bigInt);
      expect(result).toBe('12345678901234567890');
    });

    it('deve processar arrays recursivamente', () => {
      const array = [
        new Date('2024-01-15T10:30:00Z'),
        BigInt('123'),
        'string',
        null,
      ];
      const result = serializePrismaObject(array);
      expect(result).toEqual([
        '2024-01-15T10:30:00.000Z',
        '123',
        'string',
        null,
      ]);
    });

    it('deve processar objetos aninhados recursivamente', () => {
      const obj = {
        id: '123',
        createdAt: new Date('2024-01-15T10:30:00Z'),
        metadata: {
          count: BigInt('456'),
          nested: {
            date: new Date('2024-01-16T10:30:00Z'),
          },
        },
        items: [BigInt('789'), 'text'],
      };
      const result = serializePrismaObject(obj);
      expect(result).toEqual({
        id: '123',
        createdAt: '2024-01-15T10:30:00.000Z',
        metadata: {
          count: '456',
          nested: {
            date: '2024-01-16T10:30:00.000Z',
          },
        },
        items: ['789', 'text'],
      });
    });

    it('deve preservar tipos primitivos', () => {
      expect(serializePrismaObject('string')).toBe('string');
      expect(serializePrismaObject(123)).toBe(123);
      expect(serializePrismaObject(true)).toBe(true);
      expect(serializePrismaObject(false)).toBe(false);
    });

    it('deve processar objetos vazios', () => {
      const result = serializePrismaObject({});
      expect(result).toEqual({});
    });

    it('deve processar arrays vazios', () => {
      const result = serializePrismaObject([]);
      expect(result).toEqual([]);
    });

    it('deve lidar com objetos com propriedades undefined', () => {
      const obj = {
        defined: 'value',
        undefined: undefined,
      };
      const result = serializePrismaObject(obj);
      expect(result).toEqual({
        defined: 'value',
        undefined: undefined,
      });
    });
  });

  describe('createJsonResponse', () => {
    it('deve criar resposta JSON com dados serializados', () => {
      const data = {
        id: '123',
        createdAt: new Date('2024-01-15T10:30:00Z'),
        count: BigInt('456'),
      };

      const mockResponse = { status: 200, data: 'serialized' };
      (NextResponse.json as any).mockReturnValue(mockResponse);

      const result = createJsonResponse(data);

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          id: '123',
          createdAt: '2024-01-15T10:30:00.000Z',
          count: '456',
        },
        { status: 200, headers: undefined }
      );
      expect(result).toBe(mockResponse);
    });

    it('deve usar status personalizado', () => {
      const data = { message: 'success' };

      const mockResponse = { status: 201, data: 'serialized' };
      (NextResponse.json as any).mockReturnValue(mockResponse);

      const result = createJsonResponse(data, { status: 201 });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { message: 'success' },
        { status: 201, headers: undefined }
      );
    });

    it('deve usar headers personalizados', () => {
      const data = { message: 'success' };
      const headers = { 'X-Custom': 'value' };

      const mockResponse = { status: 200, data: 'serialized' };
      (NextResponse.json as any).mockReturnValue(mockResponse);

      const result = createJsonResponse(data, { headers });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { message: 'success' },
        { status: 200, headers }
      );
    });

    it('deve usar status e headers personalizados', () => {
      const data = { message: 'created' };
      const headers = { 'Content-Type': 'application/json' };

      const mockResponse = { status: 201, data: 'serialized' };
      (NextResponse.json as any).mockReturnValue(mockResponse);

      const result = createJsonResponse(data, { status: 201, headers });

      expect(NextResponse.json).toHaveBeenCalledWith(
        { message: 'created' },
        { status: 201, headers }
      );
    });

    it('deve serializar objetos complexos com JSON.stringify/parse', () => {
      const data = {
        date: new Date('2024-01-15T10:30:00Z'),
        bigInt: BigInt('12345678901234567890'),
        nested: {
          date: new Date('2024-01-16T10:30:00Z'),
          array: [BigInt('1'), BigInt('2')],
        },
      };

      const mockResponse = { status: 200, data: 'serialized' };
      (NextResponse.json as any).mockReturnValue(mockResponse);

      createJsonResponse(data);

      // Verifica que o primeiro argumento passado para NextResponse.json
      // foi processado pelo JSON.stringify/parse
      const callArgs = (NextResponse.json as any).mock.calls[0][0];
      expect(callArgs.date).toBe('2024-01-15T10:30:00.000Z');
      expect(callArgs.bigInt).toBe('12345678901234567890');
      expect(callArgs.nested.date).toBe('2024-01-16T10:30:00.000Z');
      expect(callArgs.nested.array).toEqual(['1', '2']);
    });

    it('deve lidar com dados null', () => {
      const mockResponse = { status: 200, data: null };
      (NextResponse.json as any).mockReturnValue(mockResponse);

      const result = createJsonResponse(null);

      expect(NextResponse.json).toHaveBeenCalledWith(null, {
        status: 200,
        headers: undefined,
      });
    });

    it('deve lidar com dados null', () => {
      const mockResponse = { status: 200, data: null };
      (NextResponse.json as any).mockReturnValue(mockResponse);

      const result = createJsonResponse(null);

      expect(NextResponse.json).toHaveBeenCalledWith(null, {
        status: 200,
        headers: undefined,
      });
    });
  });
});

