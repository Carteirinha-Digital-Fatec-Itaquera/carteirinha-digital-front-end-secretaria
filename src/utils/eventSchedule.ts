/**
 * Utilitários para parsing, validação e cálculo de horários de eventos.
 */

/**
 * Converte valor textual de horas em minutos inteiros positivos.
 * Aceita inteiros e decimais com vírgula ou ponto (ex: '2', '2,5', '2.5').
 * Retorna null se inválido, menor ou igual a zero, ou não numérico.
 */
export function parseWorkloadHours(value: string): number | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(',', '.');
  if (!trimmed) return null;

  // Validação estrita: apenas dígitos com ponto opcional e casas decimais
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return null;
  }

  const hours = Number(trimmed);
  if (!Number.isFinite(hours) || hours <= 0) {
    return null;
  }

  const minutes = Math.round(hours * 60);
  return minutes > 0 ? minutes : null;
}

/**
 * Calcula a data/hora final somando minutos à data/hora local de início.
 * startLocal deve estar no formato 'YYYY-MM-DDTHH:mm'.
 */
export function calculateEventEnd(
  startLocal: string,
  workloadMinutes: number
): Date | null {
  if (!startLocal || typeof startLocal !== 'string' || workloadMinutes <= 0) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(startLocal);
  if (!match) {
    return null;
  }

  const [, year, month, day, hours, minutes] = match;
  const startDate = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    0,
    0
  );

  if (Number.isNaN(startDate.getTime())) {
    return null;
  }

  return new Date(startDate.getTime() + workloadMinutes * 60 * 1000);
}

/**
 * Converte timestamps ISO em campos de data e horário locais para formulários.
 */
export function toEventFormSchedule(
  startsAt: string,
  endsAt: string
): {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
} {
  const pad = (n: number) => String(n).padStart(2, '0');

  const startDateObj = new Date(startsAt);
  const endDateObj = new Date(endsAt);

  const formatSchedule = (d: Date) => {
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());

    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`,
    };
  };

  const startFormatted = formatSchedule(startDateObj);
  const endFormatted = formatSchedule(endDateObj);

  return {
    startDate: startFormatted.date,
    startTime: startFormatted.time,
    endDate: endFormatted.date,
    endTime: endFormatted.time,
  };
}
