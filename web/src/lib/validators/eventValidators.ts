// Função para validar formato de horário (proxy para isValidTimeFormat)
export function validateTimeFormat(time: string): boolean {
  return isValidTimeFormat(time);
}

// Função para validar formato de data (proxy para isValidDateFormat)
export function validateDateFormat(date: string): boolean {
  return isValidDateFormat(date);
}

// Função para checar sobreposição de eventos
import { prisma } from '@/lib/prisma';
export async function checkEventOverlap(
  userId: string,
  date: string,
  startTime: string,
  endTime: string,
  professionalId: string,
  eventId?: string
): Promise<boolean> {
  const where: any = {
    userId,
    date,
    professionalId,
  };
  if (eventId) {
    where.id = { not: eventId };
  }
  const events = await prisma.healthEvent.findMany({
    where,
  });
  return events.some((ev: any) => {
    if (eventId && ev.id === eventId) return false;
    // Verifica sobreposição
    return (
      (startTime < ev.endTime && endTime > ev.startTime)
    );
  });
}

// Função para validar dados completos de evento
export function validateEventData(data: any): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!data.title || data.title.trim() === '') errors.title = 'Título obrigatório.';
  if (!data.date || data.date.trim() === '') errors.date = 'A data é obrigatória.';
  else if (!validateDateFormat(data.date)) errors.date = 'Formato de data inválido. Use dd/mm/yyyy ou yyyy-MM-dd.';
  if (!data.type || data.type.trim() === '') errors.type = 'Tipo obrigatório.';
  if (!data.startTime || data.startTime.trim() === '') errors.startTime = 'Horário de início obrigatório.';
  else if (!validateTimeFormat(data.startTime)) errors.startTime = 'Formato de horário inválido. Use HH:mm.';
  if (!data.endTime || data.endTime.trim() === '') errors.endTime = 'Horário de fim obrigatório.';
  else if (!validateTimeFormat(data.endTime)) errors.endTime = 'Formato de horário inválido. Use HH:mm.';
  if (
    data.startTime && data.endTime &&
    validateTimeFormat(data.startTime) &&
    validateTimeFormat(data.endTime)
  ) {
    const [sh, sm] = data.startTime.split(':').map(Number);
    const [eh, em] = data.endTime.split(':').map(Number);
    if (eh * 60 + em <= sh * 60 + sm) errors.endTime = 'Horário de fim deve ser maior que o de início.';
  }
  if (!data.professionalId || data.professionalId.trim() === '') errors.professionalId = 'Profissional obrigatório.';
  return { isValid: Object.keys(errors).length === 0, errors };
}
/**
 * Módulo de validação para eventos de saúde
 * Contém validações para data, hora de início e hora de fim
 */

export interface ValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Valida se uma string está no formato HH:mm e representa um horário válido
 */
export function isValidTimeFormat(time: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(time)) {
    return false
  }
  const [hours, minutes] = time.split(':').map(Number)
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
}

/**
 * Valida se uma data está no formato ISO (yyyy-MM-dd) ou dd/mm/yyyy
 * e se representa uma data válida (mês 1-12, dia válido para o mês/ano)
 */
export function isValidDateFormat(date: string): boolean {
  return parseDate(date) !== null
}

/**
 * Converte uma data em formato dd/mm/yyyy ou ISO para formato ISO (yyyy-MM-dd)
 * Valida se a data é realmente válida (dia/mês/ano existentes)
 */
export function parseDate(dateStr: string): string | null {
  let year: number, month: number, day: number

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    // Já está no formato ISO
    [year, month, day] = dateStr.split('-').map(Number)
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    // Formato brasileiro
    [day, month, year] = dateStr.split('/').map(Number)
  } else {
    return null
  }

  // Valida se os componentes da data são válidos
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null
  }

  // Cria uma data e verifica se ela corresponde aos valores originais
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  // Retorna no formato ISO
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}

/**
 * Valida o campo data
 * - Deve ser uma data válida (formato ISO ou dd/mm/yyyy)
 * - Não pode ser nula ou vazia
 // * - Não pode ser uma data no passado (regra removida)
 * - Não pode ser uma data muito distante (limite máximo de 2 anos)
 *
 * NOTA: Se a data for hoje, ela é válida (a validação de hora é feita separadamente)
 */
export function validateDate(
  date: string | null | undefined
): ValidationResult {
  // Verifica se a data não é nula ou vazia
  if (!date || date.trim() === '') {
    return { isValid: false, error: 'A data é obrigatória.' }
  }

  // Verifica o formato
  if (!isValidDateFormat(date)) {
    return {
      isValid: false,
      error: 'Formato de data inválido. Use dd/mm/yyyy ou yyyy-MM-dd.',
    }
  }

  // Tenta fazer o parse da data
  const parsedDate = parseDate(date)
  if (!parsedDate) {
    return { isValid: false, error: 'Data inválida.' }
  }

  // (Validação de data passada removida: eventos no passado agora são permitidos)

  // Verifica se a data não está muito distante (máximo 2 anos)
  const today = new Date()
  const maxDate = `${today.getFullYear() + 2}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  if (parsedDate > maxDate) {
    return {
      isValid: false,
      error: 'A data está muito distante (máximo 2 anos no futuro).',
    }
  }

  return { isValid: true }
}

/**
 * Valida uma data de arquivo (upload ou validade)
 * - Deve ser uma data válida no formato YYYY-MM-DD
 * - Não pode ser nula ou vazia
 * - Para datas de validade, pode ser no passado (arquivos vencidos)
 * - Para datas de upload, deve ser hoje ou no passado
 */
export function validateFileDate(
  date: string | null | undefined,
  type: 'upload' | 'expiry'
): ValidationResult {
  // Verifica se a data não é nula ou vazia
  if (!date || date.trim() === '') {
    return {
      isValid: false,
      error: `A data de ${type === 'upload' ? 'upload' : 'validade'} é obrigatória.`,
    }
  }

  // Deve estar no formato YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return {
      isValid: false,
      error: 'Formato de data inválido. Use YYYY-MM-DD.',
    }
  }

  // Validações específicas por tipo
  if (type === 'upload') {
    // Data de upload deve ser hoje ou no passado
    const today = new Date().toISOString().split('T')[0]
    if (date > today) {
      return {
        isValid: false,
        error: 'A data de upload não pode ser no futuro.',
      }
    }
  }
  // Para expiry, não há restrição de passado/futuro

  return { isValid: true }
}

/**
 * Valida o campo hora_inicio
 * - Deve ser um horário válido (formato HH:mm)
 * - Não pode ser nulo ou vazio
 * - Deve estar dentro do intervalo permitido (00:00 a 23:59)
// * - Se for no mesmo dia, não pode ser menor que o horário atual (regra removida)
 */
export function validateStartTime(
  startTime: string | null | undefined
): ValidationResult {
  // Verifica se o horário não é nulo ou vazio
  if (!startTime || startTime.trim() === '') {
    return { isValid: false, error: 'Horário de início obrigatório.' }
  }

  // Verifica o formato
  if (!isValidTimeFormat(startTime)) {
    return { isValid: false, error: 'Formato inválido. Use HH:mm.' }
  }

  // Valida o intervalo de horas e minutos
  const [hours, minutes] = startTime.split(':').map(Number)
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return {
      isValid: false,
      error: 'Horário fora do intervalo permitido (00:00 - 23:59).',
    }
  }

  return { isValid: true }
}

/**
 * Valida o campo hora_fim
 * - Deve ser um horário válido (formato HH:mm)
 * - Não pode ser nulo ou vazio
 * - Deve ser maior que hora_inicio
 * - Deve estar dentro do intervalo permitido (00:00 a 23:59)
 */
export function validateEndTime(
  endTime: string | null | undefined,
  startTime?: string
): ValidationResult {
  // Verifica se o horário não é nulo ou vazio
  if (!endTime || endTime.trim() === '') {
    return { isValid: false, error: 'Horário de fim obrigatório.' }
  }

  // Verifica o formato
  if (!isValidTimeFormat(endTime)) {
    return { isValid: false, error: 'Formato inválido. Use HH:mm.' }
  }

  // Valida o intervalo de horas e minutos
  const [endHours, endMinutes] = endTime.split(':').map(Number)
  if (endHours < 0 || endHours > 23 || endMinutes < 0 || endMinutes > 59) {
    return {
      isValid: false,
      error: 'Horário fora do intervalo permitido (00:00 - 23:59).',
    }
  }

  // Se o horário de início foi fornecido, valida se o fim é maior que o início
  if (startTime && isValidTimeFormat(startTime)) {
    const [startHours, startMinutes] = startTime.split(':').map(Number)
    const startTotalMinutes = startHours * 60 + startMinutes
    const endTotalMinutes = endHours * 60 + endMinutes

    if (endTotalMinutes <= startTotalMinutes) {
      return {
        isValid: false,
        error: 'Horário de fim deve ser maior que o de início.',
      }
    }
  }

  return { isValid: true }
}

/**
 * Valida todos os campos de data e hora de uma vez
 */
export function validateEventDateTime(
  date: string | null | undefined,
  startTime: string | null | undefined,
  endTime: string | null | undefined
): {
  isValid: boolean
  errors: { date?: string; startTime?: string; endTime?: string }
} {
  const dateValidation = validateDate(date)
  const startTimeValidation = validateStartTime(startTime)
  const endTimeValidation = validateEndTime(endTime, startTime || undefined)

  const errors: { date?: string; startTime?: string; endTime?: string } = {}

  if (!dateValidation.isValid) {
    errors.date = dateValidation.error
  }

  if (!startTimeValidation.isValid) {
    errors.startTime = startTimeValidation.error
  }

  if (!endTimeValidation.isValid) {
    errors.endTime = endTimeValidation.error
  }

  return {
    isValid:
      dateValidation.isValid &&
      startTimeValidation.isValid &&
      endTimeValidation.isValid,
    errors,
  }
}
