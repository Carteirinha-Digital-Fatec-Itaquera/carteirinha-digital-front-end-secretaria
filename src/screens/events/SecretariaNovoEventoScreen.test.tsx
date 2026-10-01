import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SecretariaNovoEventoScreen from './SecretariaNovoEventoScreen';
import * as eventService from '../../api/event/eventService';

vi.mock('../../components/menuLateral/MenuLateral', () => ({
  default: () => <div data-testid="mock-menu-lateral">MenuLateral</div>,
}));

describe('SecretariaNovoEventoScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly and submits new event successfully', async () => {
    const createSpy = vi.spyOn(eventService, 'createEvent').mockResolvedValue({
      id: 'evt-new-1',
      title: 'Semana de Dev 2026',
      description: null,
      speaker: 'Ana Dev',
      location: 'Auditório A',
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
    });

    render(
      <MemoryRouter initialEntries={['/eventos/novo']}>
        <Routes>
          <Route path="/eventos/novo" element={<SecretariaNovoEventoScreen />} />
          <Route path="/eventos" element={<div>Lista de Eventos</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Novo Evento')).toBeDefined();

    const textInputs = screen.getAllByRole('textbox');
    // Inputs: Título [0], Palestrante [1], Local [2], Carga horária [3], Descrição [4]
    fireEvent.change(textInputs[0], { target: { value: 'Semana de Dev 2026' } });
    fireEvent.change(textInputs[1], { target: { value: 'Ana Dev' } });
    fireEvent.change(textInputs[2], { target: { value: 'Auditório A' } });
    fireEvent.change(textInputs[3], { target: { value: '2' } });

    const dateInputs = document.querySelectorAll('input[type="date"]');
    const timeInputs = document.querySelectorAll('input[type="time"]');

    fireEvent.change(dateInputs[0], { target: { value: '2026-10-10' } });
    fireEvent.change(timeInputs[0], { target: { value: '14:00' } });

    // Clica em Registrar
    const submitBtn = screen.getByRole('button', { name: 'Registrar' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1);
    });

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Semana de Dev 2026',
        speaker: 'Ana Dev',
        location: 'Auditório A',
        workloadMinutes: 120,
        certificateEnabled: true,
      })
    );

    // Navega para /eventos
    await waitFor(() => {
      expect(screen.getByText('Lista de Eventos')).toBeDefined();
    });
  });

  it('displays error message when createEvent rejects', async () => {
    vi.spyOn(eventService, 'createEvent').mockRejectedValue(new Error('Conflito de sala'));

    render(
      <MemoryRouter initialEntries={['/eventos/novo']}>
        <Routes>
          <Route path="/eventos/novo" element={<SecretariaNovoEventoScreen />} />
        </Routes>
      </MemoryRouter>
    );

    const textInputs = screen.getAllByRole('textbox');
    fireEvent.change(textInputs[0], { target: { value: 'Conflito Evento' } });
    fireEvent.change(textInputs[1], { target: { value: 'Palestrante' } });
    fireEvent.change(textInputs[2], { target: { value: 'Sala 1' } });
    fireEvent.change(textInputs[3], { target: { value: '1' } });

    const dateInputs = document.querySelectorAll('input[type="date"]');
    const timeInputs = document.querySelectorAll('input[type="time"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-10-10' } });
    fireEvent.change(timeInputs[0], { target: { value: '10:00' } });

    const submitBtn = screen.getByRole('button', { name: 'Registrar' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('Conflito de sala')).toBeDefined();
    });
  });
});
