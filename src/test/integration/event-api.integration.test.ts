import { describe, it, expect, beforeAll } from 'vitest';
import { getEvents, getEvent, createEvent } from '../../api/event/eventService';
import { openCheckpoint, closeCheckpoint, getCheckpointQr } from '../../api/event/checkpointService';
import { getAttendanceSummary } from '../../api/attendance/attendanceService';
import type { CreateEventRequest } from '../../domains/Event';

const BACKEND_URL = process.env.VITE_BASE_URL || 'http://localhost:3000';
const SECRETARY_TOKEN = process.env.TEST_SECRETARY_TOKEN;

describe('HTTP Real Integration: Event Lifecycle', () => {
  let isBackendLive = false;

  beforeAll(async () => {
    if (!SECRETARY_TOKEN) {
      console.warn('TEST_SECRETARY_TOKEN não fornecido. Testes de integração HTTP real ignorados.');
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/health`);
      if (res.ok) {
        isBackendLive = true;
      }
    } catch {
      console.warn(`Backend local inacessível em ${BACKEND_URL}. Testes de integração HTTP real ignorados.`);
    }

    sessionStorage.setItem('token', SECRETARY_TOKEN);
  });

  it('createsListsAndReadsRealEvent', async () => {
    if (!isBackendLive || !SECRETARY_TOKEN) {
      console.info('Pulo justificado: ambiente de integração real local offline.');
      return;
    }

    const payload: CreateEventRequest = {
      title: `Evento Integração ${Date.now()}`,
      speaker: 'Palestrante Teste',
      location: 'Auditório Principal',
      startsAt: new Date(Date.now() + 3600000).toISOString(),
      endsAt: new Date(Date.now() + 7200000).toISOString(),
      workloadMinutes: 60,
      certificateEnabled: true,
    };

    // 1. Criar evento
    const created = await createEvent(payload);
    expect(created.id).toBeDefined();
    expect(created.title).toBe(payload.title);
    expect(created.checkpoints).toHaveLength(2);

    // 2. Listar e confirmar presença
    const all = await getEvents();
    expect(all.some((e) => e.id === created.id)).toBe(true);

    // 3. Detalhes
    const details = await getEvent(created.id);
    expect(details.id).toBe(created.id);

    // 4. Abrir checkpoint
    const opened = await openCheckpoint(created.id, 'CHECK_IN');
    expect(opened.isOpen).toBe(true);

    // 5. QR Code real com 20s
    const qr = await getCheckpointQr(created.id, 'CHECK_IN');
    expect(qr.expiresInSeconds).toBe(20);
    expect(qr.qrToken).toBeDefined();

    // 6. Fechar checkpoint
    const closed = await closeCheckpoint(created.id, 'CHECK_IN');
    expect(closed.isOpen).toBe(false);

    // 7. Summary
    const summary = await getAttendanceSummary(created.id);
    expect(summary.checkedInCount).toBeDefined();
  });
});
