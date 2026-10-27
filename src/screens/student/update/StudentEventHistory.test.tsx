import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StudentEventHistory from './StudentEventHistory';
import { management } from '../../../api/event/publicEventService';

vi.mock('../../../api/event/publicEventService', () => ({ management: vi.fn(), openManagementPdf: vi.fn() }));
it('shows confirmed and pending participation without offering revoked certificate downloads', async () => {
  const event = { id: 'event', title: 'Palestra de teste', startsAt: '2026-10-27T21:00:00Z', workloadMinutes: 60, status: 'COMPLETED' };
  vi.mocked(management).mockResolvedValue([
    { id: 'one', event, status: 'CONFIRMED', checkInAt: event.startsAt, checkOutAt: event.startsAt,
      certificate: { id: 'cert', verificationCode: 'TESTE', issuedAt: event.startsAt, revokedAt: event.startsAt, artifact: { state: 'READY' } } },
    { id: 'two', event: { ...event, id: 'other', title: 'Outra palestra' }, status: 'CHECKED_IN', checkInAt: event.startsAt, checkOutAt: null, certificate: null },
  ]);
  render(<MemoryRouter><StudentEventHistory ra="001" /></MemoryRouter>);
  await screen.findByText('Presença confirmada');
  expect(screen.getByText('Entrada registrada, saída pendente')).toBeInTheDocument();
  expect(screen.getByText(/Revogado/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Baixar certificado' })).not.toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: 'Acessar evento' })).toHaveLength(2);
  vi.mocked(management).mockResolvedValue([]);
  fireEvent.click(screen.getByRole('button', { name: 'Atualizar histórico' }));
  expect(await screen.findByText('Nenhuma participação registrada para este aluno.')).toBeInTheDocument();
});
