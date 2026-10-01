import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SecretariaEditarEventoScreen from './SecretariaEditarEventoScreen';
import * as eventService from '../../api/event/eventService';
import type { EventView } from '../../domains/Event';

vi.mock('../../components/menuLateral/MenuLateral', () => ({
  default: () => <div data-testid="mock-menu-lateral">MenuLateral</div>,
}));

describe('SecretariaEditarEventoScreen', () => {
  const fakeEvent: EventView = {
    id: 'evt-edit-1',
    title: 'Workshop de Docker',
    description: 'Aprenda containers na prática',
    speaker: 'Carlos DevOps',
    location: 'Laboratório 3',
    startsAt: '2026-10-15T18:00:00.000Z',
    endsAt: '2026-10-15T21:00:00.000Z',
    workloadMinutes: 180,
    status: 'SCHEDULED',
    cancelReason: null,
    cancelledAt: null,
    cancelledById: null,
    certificateEnabled: true,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    checkpoints: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads event data and populates form fields', async () => {
    vi.spyOn(eventService, 'getEvent').mockResolvedValue(fakeEvent);

    render(
      <MemoryRouter initialEntries={['/eventos/evt-edit-1/editar']}>
        <Routes>
          <Route
            path="/eventos/:id/editar"
            element={<SecretariaEditarEventoScreen />}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Editar Evento')).toBeDefined();
    expect(screen.getByText('Carregando dados do evento...')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByDisplayValue('Workshop de Docker')).toBeDefined();
      expect(screen.getByDisplayValue('Carlos DevOps')).toBeDefined();
      expect(screen.getByDisplayValue('Laboratório 3')).toBeDefined();
      expect(screen.getByDisplayValue('3')).toBeDefined(); // workload 180min = 3h
    });
  });

  it('submits updated event data and redirects to /eventos', async () => {
    vi.spyOn(eventService, 'getEvent').mockResolvedValue(fakeEvent);
    const updateSpy = vi.spyOn(eventService, 'updateEvent').mockResolvedValue({
      ...fakeEvent,
      title: 'Workshop de Docker e K8s',
    });

    render(
      <MemoryRouter initialEntries={['/eventos/evt-edit-1/editar']}>
        <Routes>
          <Route
            path="/eventos/:id/editar"
            element={<SecretariaEditarEventoScreen />}
          />
          <Route path="/eventos" element={<div>Lista de Eventos</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Workshop de Docker')).toBeDefined();
    });

    const titleInput = screen.getByDisplayValue('Workshop de Docker');
    fireEvent.change(titleInput, { target: { value: 'Workshop de Docker e K8s' } });

    const submitBtn = screen.getByRole('button', { name: 'Salvar Alterações' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledTimes(1);
    });

    expect(updateSpy).toHaveBeenCalledWith(
      'evt-edit-1',
      expect.objectContaining({
        title: 'Workshop de Docker e K8s',
        speaker: 'Carlos DevOps',
        location: 'Laboratório 3',
        workloadMinutes: 180,
      })
    );

    await waitFor(() => {
      expect(screen.getByText('Lista de Eventos')).toBeDefined();
    });
  });

  it('blocks editing and displays warning if event is CANCELLED', async () => {
    vi.spyOn(eventService, 'getEvent').mockResolvedValue({
      ...fakeEvent,
      status: 'CANCELLED',
      cancelReason: 'Palestrante impossibilitado por motivo de saúde',
    });

    render(
      <MemoryRouter initialEntries={['/eventos/evt-edit-1/editar']}>
        <Routes>
          <Route
            path="/eventos/:id/editar"
            element={<SecretariaEditarEventoScreen />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Este evento foi cancelado e não pode ser editado/i)
      ).toBeDefined();
      expect(
        screen.getByText(/Palestrante impossibilitado por motivo de saúde/i)
      ).toBeDefined();
    });

    // O formulário de edição não deve ser renderizado
    expect(screen.queryByRole('button', { name: 'Salvar Alterações' })).toBeNull();
  });

  it('displays error alert when getEvent fails', async () => {
    vi.spyOn(eventService, 'getEvent').mockRejectedValue(new Error('Evento não encontrado'));

    render(
      <MemoryRouter initialEntries={['/eventos/evt-invalido/editar']}>
        <Routes>
          <Route
            path="/eventos/:id/editar"
            element={<SecretariaEditarEventoScreen />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('Evento não encontrado')).toBeDefined();
    });
  });
});
