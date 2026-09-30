import type { CheckpointType, CheckpointView } from '../domains';

const TIMEZONE = 'America/Sao_Paulo';
const LOCALE = 'pt-BR';

export function formatEventDate(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatEventTime(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatWorkload(minutes: number): string {
  if (minutes <= 0) return '0 minutos';

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0 && remainingMinutes > 0) {
    const hourLabel = hours === 1 ? '1 hora' : `${hours} horas`;
    const minLabel = remainingMinutes === 1 ? '1 minuto' : `${remainingMinutes} minutos`;
    return `${hourLabel} e ${minLabel}`;
  }

  if (hours > 0) {
    return hours === 1 ? '1 hora' : `${hours} horas`;
  }

  return remainingMinutes === 1 ? '1 minuto' : `${remainingMinutes} minutos`;
}

export function getCheckpointLabel(
  checkpoint: CheckpointView
): 'Aberto' | 'Fechado' | 'Encerrado' {
  if (checkpoint.isOpen) {
    return 'Aberto';
  }
  if (checkpoint.closedAt) {
    return 'Encerrado';
  }
  return 'Fechado';
}

export function getCheckpointTypeLabel(type: CheckpointType): string {
  return type === 'CHECK_IN' ? 'Check-in (Entrada)' : 'Check-out (Saída)';
}
