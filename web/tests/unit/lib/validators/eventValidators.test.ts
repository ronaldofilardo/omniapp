import { describe, it, expect } from 'vitest';
import {
  isValidTimeFormat,
  isValidDateFormat,
  parseDate,
  validateDate,
  validateFileDate,
  validateStartTime,
  validateEndTime
} from '@/lib/validators/eventValidators';

describe('eventValidators', () => {
  it('valida formatos de horário válidos e inválidos', () => {
    expect(isValidTimeFormat('12:30')).toBe(true);
    expect(isValidTimeFormat('23:59')).toBe(true);
    expect(isValidTimeFormat('24:00')).toBe(false);
    expect(isValidTimeFormat('12:60')).toBe(false);
    expect(isValidTimeFormat('9:00')).toBe(false);
    expect(isValidTimeFormat('09:0')).toBe(false);
  });

  it('valida formatos de data válidos e inválidos', () => {
    expect(isValidDateFormat('2025-10-27')).toBe(true);
    expect(isValidDateFormat('27/10/2025')).toBe(true);
    expect(isValidDateFormat('2025/10/27')).toBe(false);
    expect(isValidDateFormat('31/02/2025')).toBe(false);
  });

  it('parseia datas corretamente', () => {
    expect(parseDate('2025-10-27')).toBe('2025-10-27');
    expect(parseDate('27/10/2025')).toBe('2025-10-27');
    expect(parseDate('31/02/2025')).toBeNull();
    expect(parseDate('2025/10/27')).toBeNull();
  });

  it('valida datas de evento', () => {
    expect(validateDate('2025-10-27').isValid).toBe(true);
    expect(validateDate('31/02/2025').isValid).toBe(false);
    expect(validateDate('').isValid).toBe(false);
  });

  it('valida datas de upload e validade de arquivos', () => {
    expect(validateFileDate('2025-10-27', 'upload').isValid).toBe(true);
    expect(validateFileDate('2025-10-27', 'expiry').isValid).toBe(true);
    expect(validateFileDate('2025-13-01', 'upload').isValid).toBe(false);
    expect(validateFileDate('', 'upload').isValid).toBe(false);
    expect(validateFileDate('2025-10-27', 'upload').isValid).toBe(true);
  });

  it('valida horário de início', () => {
    expect(validateStartTime('09:00').isValid).toBe(true);
    expect(validateStartTime('24:00').isValid).toBe(false);
    expect(validateStartTime('').isValid).toBe(false);
  });

  it('valida horário de fim', () => {
    expect(validateEndTime('10:00', '09:00').isValid).toBe(true);
    expect(validateEndTime('08:00', '09:00').isValid).toBe(false);
    expect(validateEndTime('24:00', '09:00').isValid).toBe(false);
    expect(validateEndTime('', '09:00').isValid).toBe(false);
  });
});

