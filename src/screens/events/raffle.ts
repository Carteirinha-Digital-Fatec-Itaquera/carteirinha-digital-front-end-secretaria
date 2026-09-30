import type { AttendanceView } from '../../domains/Attendance';

/**
 * Seleciona um participante vencedor de sorteio a partir de uma lista de presenças.
 * Critério obrigatório: apenas participantes com status CONFIRMED são elegíveis.
 *
 * @param items Lista de presenças do evento
 * @param random Gerador de número pseudoaleatório no intervalo [0, 1). Padrão: Math.random
 * @returns O participante sorteado, ou null se não houver participantes confirmados
 */
export function selectRaffleWinner(
  items: AttendanceView[],
  random: () => number = Math.random
): AttendanceView | null {
  const eligible = items.filter((item) => item.status === 'CONFIRMED');

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
