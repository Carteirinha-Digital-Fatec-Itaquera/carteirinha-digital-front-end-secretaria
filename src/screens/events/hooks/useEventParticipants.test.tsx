import { startSession, logoutSession } from '../../../api/auth/session';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEventParticipants } from './useEventParticipants';
import * as attendanceService from '../../../api/attendance/attendanceService';
import type { AttendanceSummary, AttendanceView } from '../../../domains/Attendance';

describe('useEventParticipants Hook', () => {
  const fakeSummary: AttendanceSummary = {
    checkedInCount: 1,
    checkedOutCount: 1,
    confirmedCount: 1,
  };

  const fakeAttendance: AttendanceView = {
    id: 'att-100',
    eventId: 'evt-100',
    eventTitle: 'Semana de Tecnologia',
    studentRa: '001234',
    studentName: 'Mariana Silva',
    studentCourse: 'DSM',
    status: 'CONFIRMED',
    checkInAt: '2026-10-05T19:00:00.000Z',
    checkOutAt: '2026-10-05T21:00:00.000Z',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('realiza leitura inicial bem-sucedida de presenças e summary', async () => {
    vi.spyOn(attendanceService, 'getEventAttendances').mockResolvedValue([fakeAttendance]);
    vi.spyOn(attendanceService, 'getAttendanceSummary').mockResolvedValue(fakeSummary);

    const { result } = renderHook(() => useEventParticipants('evt-100'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toEqual([fakeAttendance]);
    expect(result.current.summary).toEqual(fakeSummary);
    expect(result.current.stale).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.lastUpdatedAt).toBeInstanceOf(Date);
  });

  it('executa polling sem sobreposicao apos 15 segundos', async () => {
    vi.useFakeTimers();

    const attendancesSpy = vi
      .spyOn(attendanceService, 'getEventAttendances')
      .mockResolvedValue([fakeAttendance]);
    vi.spyOn(attendanceService, 'getAttendanceSummary').mockResolvedValue(fakeSummary);

    renderHook(() => useEventParticipants('evt-100'));

    // Espera primeira resolucao
    await act(async () => {
      await Promise.resolve();
    });

    expect(attendancesSpy).toHaveBeenCalledTimes(1);

    // Avanca 14999 ms -> ainda nao deve ter chamado de novo
    await act(async () => {
      vi.advanceTimersByTime(14999);
    });
    expect(attendancesSpy).toHaveBeenCalledTimes(1);

    // Avanca mais 1 ms (total 15s) -> polling dispara
    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(attendancesSpy).toHaveBeenCalledTimes(2);
  });

  it('marca stale=true e preserva itens se o polling subsequente falhar', async () => {
    vi.spyOn(attendanceService, 'getEventAttendances')
      .mockResolvedValueOnce([fakeAttendance])
      .mockRejectedValueOnce(new Error('Falha momentânea de rede'));

    vi.spyOn(attendanceService, 'getAttendanceSummary').mockResolvedValue(fakeSummary);

    const { result } = renderHook(() => useEventParticipants('evt-100'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.items.length).toBe(1);

    // Dispara refresh
    await act(async () => {
      try {
        await result.current.refresh();
      } catch {
        // erro esperado
      }
    });

    expect(result.current.items).toEqual([fakeAttendance]);
    expect(result.current.stale).toBe(true);
    expect(result.current.error).toBe('Falha momentânea de rede');
  });

  it('troca de eventId reseta os dados e busca o novo evento', async () => {
    const fakeAttendance2: AttendanceView = {
      ...fakeAttendance,
      id: 'att-200',
      eventId: 'evt-200',
      studentName: 'Outro Aluno',
    };

    vi.spyOn(attendanceService, 'getEventAttendances').mockImplementation(async (id) => {
      return id === 'evt-200' ? [fakeAttendance2] : [fakeAttendance];
    });
    vi.spyOn(attendanceService, 'getAttendanceSummary').mockResolvedValue(fakeSummary);

    const { result, rerender } = renderHook(({ id }) => useEventParticipants(id), {
      initialProps: { id: 'evt-100' },
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.items[0].studentName).toBe('Mariana Silva');

    rerender({ id: 'evt-200' });

    await waitFor(() => {
      expect(result.current.items[0]?.studentName).toBe('Outro Aluno');
    });
  });
});

beforeEach(() => startSession('eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDB9.c2lnbmF0dXJl'));
afterEach(() => { act(() => logoutSession()); });
