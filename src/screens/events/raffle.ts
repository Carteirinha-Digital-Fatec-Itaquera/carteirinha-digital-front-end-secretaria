import type { AttendanceView } from '../../domains/Attendance';

export function isRaffleEligible(item: AttendanceView): boolean {
  return Boolean(item.checkInAt) && (item.status === 'CHECKED_IN' || item.status === 'CONFIRMED');
}

/**
 * Seleciona um participante vencedor de sorteio a partir de uma lista de presenças.
 * Critério obrigatório: participantes com entrada registrada são elegíveis, com ou sem check-out.
 *
 * @param items Lista de presenças do evento
 * @param random Gerador de número pseudoaleatório no intervalo [0, 1). Padrão: Math.random
 * @returns O participante sorteado, ou null se não houver participantes com entrada registrada
 */
export function selectRaffleWinner(
  items: AttendanceView[],
  random: () => number = Math.random
): AttendanceView | null {
  const eligible = items.filter(isRaffleEligible);

  if (eligible.length === 0) {
    return null;
  }

  const r = random();

  if (typeof r !== 'number' || isNaN(r) || r < 0 || r >= 1) {
    throw new Error(`Gerador aleatório inválido: o valor deve estar no intervalo [0, 1). Recebido: ${r}`);
  }

  const index = Math.floor(r * eligible.length);
  return eligible[index] ?? null;
}
