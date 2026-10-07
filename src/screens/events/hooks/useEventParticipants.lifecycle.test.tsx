import { startSession, logoutSession } from '../../../api/auth/session';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as service from '../../../api/attendance/attendanceService';
import type { AttendanceView } from '../../../domains/Attendance';
import { useEventParticipants } from './useEventParticipants';

const summary = { checkedInCount: 0, checkedOutCount: 0, confirmedCount: 0 };
const attendance: AttendanceView = {
  id: 'attendance-1', eventId: 'event-1', eventTitle: 'Evento',
  studentRa: '123', studentName: 'Aluno', studentCourse: 'DSM',
  checkInAt: '2026-10-03T10:00:00Z', checkOutAt: null, status: 'CHECKED_IN',
};
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('ciclo de vida do carregamento de participantes', () => {
  it('recupera a consulta cancelada na remontagem de efeitos do StrictMode', async () => {
    const requests = vi.spyOn(service, 'getEventAttendances').mockResolvedValue([]);
    vi.spyOn(service, 'getAttendanceSummary').mockResolvedValue(summary);
    const { result } = renderHook(() => useEventParticipants('event-1'), { reactStrictMode: true });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(requests).toHaveBeenCalledTimes(2);
    expect(requests.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(result.current.summary).toEqual(summary);
  });

  it('consulta o novo evento mesmo enquanto a consulta anterior estÃ¡ pendente', async () => {
    let resolveOld!: (rows: AttendanceView[]) => void;
    const requests = vi.spyOn(service, 'getEventAttendances')
      .mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
      .mockResolvedValue([{ ...attendance, eventId: 'event-2' }]);
    vi.spyOn(service, 'getAttendanceSummary').mockResolvedValue(summary);
    const { result, rerender } = renderHook(({ id }) => useEventParticipants(id), { initialProps: { id: 'event-1' } });
    rerender({ id: 'event-2' });
    await waitFor(() => expect(result.current.items[0]?.eventId).toBe('event-2'));
    await act(async () => { resolveOld([attendance]); });
    expect(result.current.items[0].eventId).toBe('event-2');
    expect(result.current.loading).toBe(false);
    expect(requests).toHaveBeenCalledTimes(2);
  });

  it('continua o polling apÃ³s StrictMode e exibe check-in e check-out', async () => {
    vi.useFakeTimers();
    let rows: AttendanceView[] = [];
    const requests = vi.spyOn(service, 'getEventAttendances').mockImplementation(async () => rows);
    vi.spyOn(service, 'getAttendanceSummary').mockImplementation(async () => ({
      checkedInCount: rows.length, checkedOutCount: rows.filter(r => r.status === 'CONFIRMED').length,
      confirmedCount: rows.filter(r => r.status === 'CONFIRMED').length,
    }));
    const { result } = renderHook(() => useEventParticipants('event-1'), { reactStrictMode: true });
    await act(async () => { await Promise.resolve(); });
    expect(result.current.loading).toBe(false);
    rows = [attendance];
    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
    expect(result.current.items[0].status).toBe('CHECKED_IN');
    rows = [{ ...attendance, status: 'CONFIRMED', checkOutAt: '2026-10-03T12:00:00Z' }];
    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
    expect(result.current.items[0].status).toBe('CONFIRMED');
    expect(result.current.summary?.confirmedCount).toBe(1);
    expect(requests).toHaveBeenCalledTimes(4);
  });
});

beforeEach(() => startSession('eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDB9.c2lnbmF0dXJl'));
afterEach(() => { act(() => logoutSession()); });

it('limpa dados e interrompe polling e retomada de visibilidade após logout', async () => {
  vi.useFakeTimers();
  const requests = vi.spyOn(service, 'getEventAttendances').mockResolvedValue([attendance]);
  vi.spyOn(service, 'getAttendanceSummary').mockResolvedValue(summary);
  const { result } = renderHook(() => useEventParticipants('event-1'));
  await act(async () => { await Promise.resolve(); });
  expect(result.current.items).toHaveLength(1);
  act(() => logoutSession());
  expect(result.current.items).toEqual([]);
  expect(result.current.summary).toBeNull();
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(60000);
  });
  expect(requests).toHaveBeenCalledTimes(1);
});
