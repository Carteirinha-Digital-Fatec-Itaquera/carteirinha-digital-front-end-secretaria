import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ParticipantsPanel } from './ParticipantsPanel';
import * as api from '../../../api/event/publicEventService';
import type { AttendanceView } from '../../../domains/Attendance';

const row: AttendanceView = { id: 'attendance-id', eventId: 'event-id', eventTitle: 'Atividade', studentRa: '123', studentName: 'Pessoa teste', studentCourse: 'DSM', status: 'CHECKED_IN', checkInAt: '2026-10-26T10:00:00Z', checkOutAt: null };
const person = { id: 'participant-id', name: row.studentName, course: 'DSM', role: 'ATTENDEE', visitorId: null, attendance: { id: row.id, checkInAt: row.checkInAt, checkOutAt: null, status: 'CHECKED_IN' }, certificate: null };
const props = { items: [row], loading: false, refreshing: false, stale: false, error: null, lastUpdatedAt: null, onRefresh: vi.fn(), eventId: 'event-id' };
const showModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
const close = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
beforeEach(() => {
  vi.restoreAllMocks(); props.onRefresh.mockClear();
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.setAttribute('open', ''); } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.removeAttribute('open'); } });
});
afterEach(() => {
  if (showModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showModal); else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  if (close) Object.defineProperty(HTMLDialogElement.prototype, 'close', close); else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
});
const setup = (details = [person]) => vi.spyOn(api, 'management').mockImplementation(path => Promise.resolve(path.endsWith('/participants') ? details : []));
async function openAction() {
  fireEvent.click(screen.getByLabelText('Ações para Pessoa teste'));
  fireEvent.click(screen.getByRole('button', { name: 'Registrar saída manual' }));
  return screen.findByRole('dialog', { name: 'Registrar saída e confirmar presença' });
}
describe('Manual checkout from participant row', () => {
  it('confirms by attendance ID, requires reason and refreshes list without QR', async () => {
    const request = setup(); render(<ParticipantsPanel {...props} />);
    await openAction();
    fireEvent.change(screen.getByLabelText('Justificativa obrigatória'), { target: { value: 'Participação e saída conferidas pela Secretaria.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar presença manual' }));
    await waitFor(() => expect(props.onRefresh).toHaveBeenCalledTimes(1));
    expect(request).toHaveBeenCalledWith('events/event-id/manual-presence', { attendanceId: row.id, checkpoint: 'CHECK_OUT', reason: 'Participação e saída conferidas pela Secretaria.' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('supports legacy attendance with no participant details and cancel never registers', async () => {
    const request = setup([]); render(<ParticipantsPanel {...props} />);
    await openAction(); fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(request.mock.calls.some(([path]) => path.endsWith('/manual-presence'))).toBe(false);
  });
  it('does not offer checkout for confirmed people or allow cancelled events', async () => {
    setup(); const { rerender }=render(<ParticipantsPanel {...props} eventStatus="CANCELLED" />);
    fireEvent.click(screen.getByLabelText('Ações para Pessoa teste'));
    expect(screen.getByRole('button', { name: 'Registrar saída manual' })).toBeDisabled();
    await act(async () => { rerender(<ParticipantsPanel {...props} items={[{ ...row, status: 'CONFIRMED', checkOutAt: '2026-10-26T11:00:00Z' }]} />); });
    expect(screen.queryByRole('button', { name: 'Registrar saída manual' })).not.toBeInTheDocument();
  });
  it('preserves reason after request failure and prevents double submission', async () => {
    const request = setup(); let reject!: (reason: Error) => void;
    request.mockImplementation(path => path.endsWith('/manual-presence') ? new Promise((_, fail) => { reject=fail; }) : Promise.resolve([]));
    render(<ParticipantsPanel {...props} />); await openAction();
    fireEvent.change(screen.getByLabelText('Justificativa obrigatória'), { target: { value: 'Participação conferida pessoalmente.' } });
    const submit = screen.getByRole('button', { name: 'Confirmar presença manual' }); fireEvent.click(submit); fireEvent.click(submit);
    expect(request.mock.calls.filter(([path]) => path.endsWith('/manual-presence'))).toHaveLength(1);
    reject(new Error('Falha de rede'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha de rede');
    expect(screen.getByLabelText('Justificativa obrigatória')).toHaveValue('Participação conferida pessoalmente.');
  });
});
