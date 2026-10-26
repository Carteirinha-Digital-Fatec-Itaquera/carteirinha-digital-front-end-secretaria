import { describe, expect, it } from 'vitest';
import { selectRaffleWinner } from './raffle';
import type { AttendanceView } from '../../domains/Attendance';

describe('selectRaffleWinner', () => {
  const checkedInAttendance: AttendanceView = {
    id: 'att-1',
    eventId: 'evt-1',
    eventTitle: 'Workshop',
    studentRa: '111111',
    studentName: 'Aluno Checado',
    studentCourse: 'DSM',
    status: 'CHECKED_IN',
    checkInAt: '2026-10-05T19:00:00.000Z',
    checkOutAt: null,
  };

  const confirmedAttendance1: AttendanceView = {
    id: 'att-2',
    eventId: 'evt-1',
    eventTitle: 'Workshop',
    studentRa: '222222',
    studentName: 'Aluno Confirmado 1',
    studentCourse: 'DSM',
    status: 'CONFIRMED',
    checkInAt: '2026-10-05T19:00:00.000Z',
    checkOutAt: '2026-10-05T21:00:00.000Z',
  };

  const confirmedAttendance2: AttendanceView = {
    id: 'att-3',
    eventId: 'evt-1',
    eventTitle: 'Workshop',
    studentRa: '333333',
    studentName: 'Aluno Confirmado 2',
    studentCourse: 'GTI',
    status: 'CONFIRMED',
    checkInAt: '2026-10-05T19:05:00.000Z',
    checkOutAt: '2026-10-05T21:05:00.000Z',
  };

  it('seleciona participante com check-in antes de registrar saída', () => {
    const winner = selectRaffleWinner([checkedInAttendance]);
    expect(winner?.id).toBe(checkedInAttendance.id);
  });

  it('retorna null sem entrada registrada', () => {
    expect(selectRaffleWinner([])).toBeNull();
    expect(selectRaffleWinner([{ ...checkedInAttendance, checkInAt: null }])).toBeNull();
  });

  it('selectsFirstAndLastEligible: seleciona primeira e ultima posicao usando gerador deterministico', () => {
    const items = [checkedInAttendance, confirmedAttendance1, confirmedAttendance2];

    // random() = 0 -> primeira entrada registrada (checkedInAttendance)
    const winnerFirst = selectRaffleWinner(items, () => 0);
    expect(winnerFirst?.id).toBe(checkedInAttendance.id);

    // random() = 0.999999 -> ultimo confirmado (confirmedAttendance2)
    const winnerLast = selectRaffleWinner(items, () => 0.999999);
    expect(winnerLast?.id).toBe(confirmedAttendance2.id);
  });

  it('throwsForInvalidRandom: lanca erro se gerador aleatorio retornar fora do intervalo [0, 1)', () => {
    const items = [confirmedAttendance1];

    expect(() => selectRaffleWinner(items, () => 1.0)).toThrow('Gerador aleatório inválido');
    expect(() => selectRaffleWinner(items, () => -0.1)).toThrow('Gerador aleatório inválido');
    expect(() => selectRaffleWinner(items, () => NaN)).toThrow('Gerador aleatório inválido');
  });
});
