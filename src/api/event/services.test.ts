import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  cancelEvent,
  deleteEvent,
} from './eventService';
import {
  openCheckpoint,
  closeCheckpoint,
  getCheckpointQr,
} from './checkpointService';
import {
  getEventAttendances,
  getAttendanceSummary,
} from '../attendance/attendanceService';
import type { CreateEventRequest, UpdateEventRequest } from '../../domains/Event';

describe('Event, Checkpoint and Attendance Services', () => {
  const originalFetch = globalThis.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem('token', 'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDB9.c2lnbmF0dXJl');
    vi.restoreAllMocks();
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('eventService', () => {
    it('getEvents calls GET /events with Authorization and returns array', async () => {
      const mockEvents = [{ id: 'evt-1', title: 'Test Event' }];
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockEvents,
      });

      const result = await getEvents();
      expect(result).toEqual(mockEvents);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toMatch(/\/events$/);
      expect(init?.method).toBe('GET');
    });

    it('getEvent calls GET /events/:id with encoded id', async () => {
      const mockEvent = { id: 'evt/special', title: 'Special Event' };
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockEvent,
      });

      const result = await getEvent('evt/special');
      expect(result).toEqual(mockEvent);
      const [url] = fetchMock.mock.calls[0];
      expect(url).toMatch(/\/events\/evt%2Fspecial$/);
    });

    it('createEvent sends POST /events with stringified body', async () => {
      const payload: CreateEventRequest = {
        title: 'Tech Day',
        speaker: 'John Doe',
        location: 'Auditorium',
        startsAt: '2026-10-10T10:00:00.000Z',
        endsAt: '2026-10-10T12:00:00.000Z',
        workloadMinutes: 120,
      };
      fetchMock.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: 'evt-new', ...payload }),
      });

      const result = await createEvent(payload);
      expect(result.id).toBe('evt-new');
      const [, init] = fetchMock.mock.calls[0];
      expect(init?.method).toBe('POST');
      expect(JSON.parse(init?.body as string)).toEqual(payload);
    });

    it('updateEvent sends PATCH /events/:id with stringified body', async () => {
      const payload: UpdateEventRequest = { status: 'CANCELLED' };
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 'evt-1', status: 'CANCELLED' }),
      });

      const result = await updateEvent('evt-1', payload);
      expect(result.status).toBe('CANCELLED');
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toMatch(/\/events\/evt-1$/);
      expect(init?.method).toBe('PATCH');
      expect(JSON.parse(init?.body as string)).toEqual(payload);
    });

    it('cancelEvent sends POST /events/:id/cancel with reason', async () => {
      const payload = { reason: 'Motivo cancelamento' };
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 'evt-1', status: 'CANCELLED', cancelReason: payload.reason }),
      });

      const result = await cancelEvent('evt-1', payload);
      expect(result.status).toBe('CANCELLED');
      expect(result.cancelReason).toBe(payload.reason);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toMatch(/\/events\/evt-1\/cancel$/);
      expect(init?.method).toBe('POST');
      expect(JSON.parse(init?.body as string)).toEqual(payload);
    });

    it('deleteEvent sends DELETE /events/:id', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Evento excluído com sucesso' }),
      });

      const result = await deleteEvent('evt-1');
      expect(result.message).toBe('Evento excluído com sucesso');
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toMatch(/\/events\/evt-1$/);
      expect(init?.method).toBe('DELETE');
    });
  });

  describe('checkpointService', () => {
    it('openCheckpoint calls POST /events/:id/checkpoints/check-in/open', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ eventId: 'evt-1', type: 'CHECK_IN', isOpen: true }),
      });

      const result = await openCheckpoint('evt-1', 'CHECK_IN');
      expect(result.isOpen).toBe(true);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toMatch(/\/events\/evt-1\/checkpoints\/check-in\/open$/);
      expect(init?.method).toBe('POST');
    });

    it('closeCheckpoint calls POST /events/:id/checkpoints/check-out/close', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ eventId: 'evt-1', type: 'CHECK_OUT', isOpen: false }),
      });

      const result = await closeCheckpoint('evt-1', 'CHECK_OUT');
      expect(result.isOpen).toBe(false);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toMatch(/\/events\/evt-1\/checkpoints\/check-out\/close$/);
      expect(init?.method).toBe('POST');
    });

    it('getCheckpointQr calls GET /events/:id/checkpoints/check-in/qr and returns canonical token response', async () => {
      const mockQr = {
        qrToken: 'header.payload.signature',
        expiresInSeconds: 20,
        expiresAt: '2026-10-10T10:00:20.000Z',
        checkpointVersion: 1,
      };
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockQr,
      });

      const result = await getCheckpointQr('evt-1', 'CHECK_IN');
      expect(result.expiresInSeconds).toBe(20);
      expect(result.qrToken).toBe('header.payload.signature');
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toMatch(/\/events\/evt-1\/checkpoints\/check-in\/qr$/);
      expect(init?.method).toBe('GET');
    });

    it('getCheckpointQr supports optional qrUrl and serverTime for short link optimization', async () => {
      const mockQr = {
        qrToken: 'jwt.token.here',
        qrUrl: 'https://carteirinha-digital-front-end-aluno.vercel.app/p/ref1234567890',
        serverTime: '2026-10-10T10:00:00.000Z',
        expiresInSeconds: 20,
        expiresAt: '2026-10-10T10:00:20.000Z',
        checkpointVersion: 2,
      };
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockQr,
      });

      const result = await getCheckpointQr('evt-1', 'CHECK_OUT');
      expect(result.qrUrl).toBe('https://carteirinha-digital-front-end-aluno.vercel.app/p/ref1234567890');
      expect(result.serverTime).toBe('2026-10-10T10:00:00.000Z');
      expect(result.qrToken).toBe('jwt.token.here');
    });
  });

  describe('attendanceService', () => {
    it('getEventAttendances calls GET /events/:id/attendances', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [{ studentRa: '0123456789', status: 'CONFIRMED' }],
      });

      const result = await getEventAttendances('evt-1');
      expect(result).toHaveLength(1);
      expect(result[0].studentRa).toBe('0123456789');
      const [url] = fetchMock.mock.calls[0];
      expect(url).toMatch(/\/events\/evt-1\/attendances$/);
    });

    it('getAttendanceSummary calls GET /events/:id/attendances/summary', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ checkedInCount: 10, checkedOutCount: 8, confirmedCount: 8 }),
      });

      const result = await getAttendanceSummary('evt-1');
      expect(result.confirmedCount).toBe(8);
      const [url] = fetchMock.mock.calls[0];
      expect(url).toMatch(/\/events\/evt-1\/attendances\/summary$/);
    });
  });
});
