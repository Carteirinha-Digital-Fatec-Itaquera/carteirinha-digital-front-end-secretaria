import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SecretariaEventosScreen from './SecretariaEventosScreen';
import * as eventService from '../../api/event/eventService';
import type { EventView } from '../../domains/Event';

vi.mock('../../components/menuLateral/MenuLateral', () => ({
  default: () => <div data-testid="mock-menu-lateral">MenuLateral</div>,
}));

describe('SecretariaEventosScreen', () => {
  const fakeEvents: EventView[] = [
    {
      id: 'evt-1',
      title: 'Workshop de Cloud',
      description: null,
      speaker: 'Maria Cloud',
      location: 'Auditório 1',
      startsAt: '2026-10-10T14:00:00.000Z',
      endsAt: '2026-10-10T16:00:00.000Z',
      workloadMinutes: 120,
      status: 'SCHEDULED',
      cancelReason: null,
      cancelledAt: null,
      cancelledById: null,
      certificateEnabled: true,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      checkpoints: [],
    },
    {
      id: 'evt-2',
      title: 'Palestra Cancelada de IoT',
      description: null,
      speaker: 'João IoT',
      location: 'Lab 2',
      startsAt: '2026-10-12T10:00:00.000Z',
      endsAt: '2026-10-12T12:00:00.000Z',
      workloadMinutes: 120,
      status: 'CANCELLED',
      cancelReason: 'Palestrante em viagem imprevista',
      cancelledAt: '2026-10-02T10:00:00.000Z',
      cancelledById: null,
      certificateEnabled: true,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-02T10:00:00.000Z',
      checkpoints: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders events list and displays cancel badge for cancelled events', async () => {
    vi.spyOn(eventService, 'getEvents').mockResolvedValue(fakeEvents);

    render(
      <MemoryRouter initialEntries={['/eventos']}>
        <Routes>
          <Route path="/eventos" element={<SecretariaEventosScreen />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Workshop de Cloud')).toBeDefined();
      expect(screen.getByText('Palestra Cancelada de IoT')).toBeDefined();
    });

    // Badge de cancelado
    expect(screen.getByText('Cancelado')).toBeDefined();
    expect(screen.getByText(/Palestrante em viagem imprevista/i)).toBeDefined();

    // Evento ativo tem botões Editar e Cancelar
    expect(screen.getByRole('button', { name: /editar/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeDefined();
  });

  it('navigates to /eventos/:id/editar when clicking edit button', async () => {
    vi.spyOn(eventService, 'getEvents').mockResolvedValue(fakeEvents);

    render(
      <MemoryRouter initialEntries={['/eventos']}>
        <Routes>
          <Route path="/eventos" element={<SecretariaEventosScreen />} />
          <Route path="/eventos/:id/editar" element={<div>Tela de Edição</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Workshop de Cloud')).toBeDefined();
    });

    const editBtn = screen.getByRole('button', { name: /editar/i });
    fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText('Tela de Edição')).toBeDefined();
    });
  });

  it('opens cancel dialog and cancels event when confirmed', async () => {
    vi.spyOn(eventService, 'getEvents').mockResolvedValue(fakeEvents);
    const cancelSpy = vi.spyOn(eventService, 'cancelEvent').mockResolvedValue({
      ...fakeEvents[0],
      status: 'CANCELLED',
      cancelReason: 'Falta de energia no prédio',
    });

    render(
      <MemoryRouter initialEntries={['/eventos']}>
        <Routes>
          <Route path="/eventos" element={<SecretariaEventosScreen />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Workshop de Cloud')).toBeDefined();
    });

    const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelBtn);

    // Modal aberto
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Cancelar Evento')).toBeDefined();

    // Preenche motivo e confirma
    const textarea = screen.getByPlaceholderText(/Informe o motivo formal do cancelamento/i);
    fireEvent.change(textarea, { target: { value: 'Falta de energia no prédio' } });

    const confirmBtn = screen.getByRole('button', { name: 'Confirmar Cancelamento' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(cancelSpy).toHaveBeenCalledWith('evt-1', {
        reason: 'Falta de energia no prédio',
      });
    });

    // Mensagem de sucesso
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeDefined();
      expect(screen.getByText(/cancelado com sucesso/i)).toBeDefined();
    });
  });
});
