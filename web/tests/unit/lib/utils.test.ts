import { describe, it, expect } from 'vitest';
import { formatDate, truncateText } from '@/lib/utils';

describe('Utils - formatDate', () => {
  it('deve formatar data em formato brasileiro', () => {
    const date = '2024-01-15T10:30:00Z';
    const formatted = formatDate(date);
    
    // Verifica se contém os elementos esperados da data
    expect(formatted).toMatch(/15/); // dia
    expect(formatted).toMatch(/01/); // mês
    expect(formatted).toMatch(/2024/); // ano
  });

  it('deve incluir hora e minuto', () => {
    const date = '2024-01-15T10:30:00Z';
    const formatted = formatDate(date);
    
    // A hora pode variar por timezone, então apenas verificamos o formato
    expect(formatted).toMatch(/\d{2}:\d{2}/); // formato HH:MM
  });

  it('deve formatar corretamente data no início do ano', () => {
    const date = '2024-01-01T12:00:00Z';
    const formatted = formatDate(date);
    
    // Verifica formato e presença de elementos, considerando timezone
    expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/); // formato DD/MM/YYYY
    expect(formatted).toBeTruthy();
  });

  it('deve formatar corretamente data no fim do ano', () => {
    const date = '2024-12-31T23:59:00Z';
    const formatted = formatDate(date);
    
    expect(formatted).toMatch(/31/); // dia
    expect(formatted).toMatch(/12/); // mês
    expect(formatted).toMatch(/2024/); // ano
  });

  it('deve lidar com diferentes formatos de string de data', () => {
    const date1 = '2024-06-15T14:30:00.000Z';
    const date2 = '2024-06-15T14:30:00Z';
    const date3 = '2024-06-15';
    
    expect(() => formatDate(date1)).not.toThrow();
    expect(() => formatDate(date2)).not.toThrow();
    expect(() => formatDate(date3)).not.toThrow();
  });

  it('deve formatar datas de diferentes meses corretamente', () => {
    const dates = [
      '2024-01-15T10:00:00Z',
      '2024-06-15T10:00:00Z',
      '2024-12-15T10:00:00Z',
    ];

    dates.forEach(date => {
      const formatted = formatDate(date);
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });
  });

  it('deve usar formato pt-BR', () => {
    const date = '2024-03-25T15:45:00Z';
    const formatted = formatDate(date);
    
    // Formato brasileiro usa DD/MM/YYYY
    expect(formatted).toMatch(/25/); // dia vem primeiro
    expect(formatted).toMatch(/03/); // mês vem depois
  });
});

describe('Utils - truncateText', () => {
  it('deve retornar texto completo quando menor que maxLength', () => {
    const text = 'Texto curto';
    const result = truncateText(text, 20);
    
    expect(result).toBe('Texto curto');
  });

  it('deve retornar texto completo quando igual a maxLength', () => {
    const text = 'Exatamente vinte car';
    const result = truncateText(text, 20);
    
    expect(result).toBe('Exatamente vinte car');
  });

  it('deve truncar e adicionar reticências quando maior que maxLength', () => {
    const text = 'Este é um texto muito longo que precisa ser truncado';
    const result = truncateText(text, 20);
    
    expect(result).toBe('Este é um texto muit...');
    expect(result.length).toBe(23); // 20 caracteres + '...'
  });

  it('deve truncar corretamente com maxLength = 10', () => {
    const text = 'Texto longo demais para caber';
    const result = truncateText(text, 10);
    
    expect(result).toBe('Texto long...');
    expect(result.length).toBe(13); // 10 + 3
  });

  it('deve lidar com maxLength = 0', () => {
    const text = 'Qualquer texto';
    const result = truncateText(text, 0);
    
    expect(result).toBe('...');
  });

  it('deve lidar com maxLength = 1', () => {
    const text = 'Texto';
    const result = truncateText(text, 1);
    
    expect(result).toBe('T...');
  });

  it('deve lidar com texto vazio', () => {
    const text = '';
    const result = truncateText(text, 10);
    
    expect(result).toBe('');
  });

  it('deve lidar com texto de um caractere', () => {
    const text = 'A';
    const result = truncateText(text, 10);
    
    expect(result).toBe('A');
  });

  it('deve truncar exatamente no maxLength especificado', () => {
    const text = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const result = truncateText(text, 5);
    
    expect(result).toBe('ABCDE...');
    expect(result.substring(0, 5)).toBe('ABCDE');
  });

  it('deve funcionar com textos contendo caracteres especiais', () => {
    const text = 'Olá! Como você está? Tudo bem?';
    const result = truncateText(text, 15);
    
    expect(result).toBe('Olá! Como você ...');
  });

  it('deve funcionar com números', () => {
    const text = '123456789012345';
    const result = truncateText(text, 10);
    
    expect(result).toBe('1234567890...');
  });

  it('deve preservar espaços no início do texto truncado', () => {
    const text = '   Texto com espaços no início';
    const result = truncateText(text, 10);
    
    expect(result).toBe('   Texto c...');
  });

  it('deve funcionar com textos multilinha', () => {
    const text = 'Linha 1\nLinha 2\nLinha 3 é muito longa';
    const result = truncateText(text, 15);
    
    expect(result.length).toBe(18); // 15 + '...'
    expect(result.endsWith('...')).toBe(true);
  });

  it('deve lidar com maxLength negativo', () => {
    const text = 'Texto qualquer';
    const result = truncateText(text, -5);
    
    expect(result).toBe('...');
  });

  it('deve funcionar com texto Unicode', () => {
    const text = '🎉 Celebração! 🎊 Festa muito legal 🥳';
    const result = truncateText(text, 20);
    
    expect(result.endsWith('...')).toBe(true);
    expect(result.length).toBeGreaterThan(20);
  });
});

describe('Utils - Integração', () => {
  it('deve funcionar em conjunto: formatDate e truncateText', () => {
    const date = '2024-01-15T10:30:00Z';
    const formatted = formatDate(date);
    const truncated = truncateText(formatted, 10);
    
    expect(truncated).toBeTruthy();
    expect(typeof truncated).toBe('string');
  });

  it('deve lidar com múltiplas chamadas de truncateText', () => {
    const text = 'Este é um texto muito longo que será truncado múltiplas vezes';
    
    const result1 = truncateText(text, 30);
    const result2 = truncateText(result1, 20);
    const result3 = truncateText(result2, 10);
    
    expect(result3.length).toBeLessThanOrEqual(13);
    expect(result3.endsWith('...')).toBe(true);
  });
});

