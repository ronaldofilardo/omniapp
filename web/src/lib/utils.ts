export function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function formatTime(date: Date | string) {
  if (!date) return '';

  // Se for uma string no formato HH:MM, criar uma data válida
  if (typeof date === 'string' && /^\d{1,2}:\d{2}$/.test(date)) {
    console.log('[formatTime] Processing time string:', date);
    const [hours, minutes] = date.split(':').map(Number);
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    const result = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    console.log('[formatTime] Result:', result);
    return result;
  }

  // Caso contrário, tratar como Date normal
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    console.log('[formatTime] Invalid date:', date);
    return '';
  }
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
