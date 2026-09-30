import { describe, it, expect } from 'vitest';
import {
  formatEventDate,
  formatEventTime,
  formatWorkload,
  getCheckpointLabel,
  getCheckpointTypeLabel,
} from './eventPresentation';
import type { CheckpointView, AttendanceView } from '../domains';
import eventsFixture from '../test/fixtures/events.mock.json';
import attendanceFixture from '../test/fixtures/attendance.mock.json';

describe('eventPresentation utils and V1 contract invariants', () => {
  it('preservesV1NamesAndLeadingZeroRa', () => {
    // Validando contratos e fixtures
    expect(eventsFixture).toBeDefined();
    const event = eventsFixture.events[0];
    expect(event.id).toBe('11111111-1111-4111-8111-111111111111');
    expect(event.title).toBe('Arquitetura de Software na Prática');
    expect(event.status).toBe('SCHEDULED');
    expect(event.workloadMinutes).toBe(120);

    const attendance = attendanceFixture.attendances[0] as AttendanceView;
    expect(attendance.studentRa).toBe('RA-EXEMPLO-001');
    expect(attendance.status).toBe('CONFIRMED');

    // Invariante de RA com zero inicial no TypeScript
    const attendanceWithZeroRa: AttendanceView = {
      ...attendance,
      studentRa: '0123456789',
    };
    expect(attendanceWithZeroRa.studentRa.startsWith('0')).toBe(true);
  });

  it('formatsBrazilianEventDateAcrossUtcMidnight', () => {
    // 2026-10-06T01:00:00.000Z em America/Sao_Paulo (UTC-3) é 05/10/2026 22:00
    const isoMidnightCross = '2026-10-06T01:00:00.000Z';
    expect(formatEventDate(isoMidnightCross)).toBe('05/10/2026');
    expect(formatEventTime(isoMidnightCross)).toBe('22:00');

    // 2026-10-20T22:00:00.000Z em America/Sao_Paulo (UTC-3) é 20/10/2026 19:00
    const isoRegular = '2026-10-20T22:00:00.000Z';
    expect(formatEventDate(isoRegular)).toBe('20/10/2026');
    expect(formatEventTime(isoRegular)).toBe('19:00');
  });

  it('formatsWorkloadAndCheckpointStates', () => {
    expect(formatWorkload(120)).toBe('2 horas');
    expect(formatWorkload(60)).toBe('1 hora');
    expect(formatWorkload(90)).toBe('1 hora e 30 minutos');
    expect(formatWorkload(45)).toBe('45 minutos');
    expect(formatWorkload(1)).toBe('1 minuto');
    expect(formatWorkload(0)).toBe('0 minutos');

    const openCheckpoint: CheckpointView = {
      id: 'c1',
      eventId: 'e1',
      type: 'CHECK_IN',
      isOpen: true,
      version: 1,
      openedAt: '2026-10-20T19:00:00.000Z',
      closedAt: null,
    };
    expect(getCheckpointLabel(openCheckpoint)).toBe('Aberto');

    const closedNeverEnded: CheckpointView = {
      id: 'c2',
      eventId: 'e1',
      type: 'CHECK_OUT',
      isOpen: false,
      version: 1,
      openedAt: null,
      closedAt: null,
    };
    expect(getCheckpointLabel(closedNeverEnded)).toBe('Fechado');

    const closedEnded: CheckpointView = {
      id: 'c3',
      eventId: 'e1',
      type: 'CHECK_IN',
      isOpen: false,
      version: 2,
      openedAt: '2026-10-20T19:00:00.000Z',
      closedAt: '2026-10-20T20:00:00.000Z',
    };
    expect(getCheckpointLabel(closedEnded)).toBe('Encerrado');

    expect(getCheckpointTypeLabel('CHECK_IN')).toBe('Check-in (Entrada)');
    expect(getCheckpointTypeLabel('CHECK_OUT')).toBe('Check-out (Saída)');
  });
});
