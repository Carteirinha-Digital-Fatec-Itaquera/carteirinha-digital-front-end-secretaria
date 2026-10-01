import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EventForm } from './EventForm';
import type { EventView } from '../../../domains/Event';

describe('EventForm component', () => {
  it('renders creation form with empty fields and automatic calculation badge', () => {
    render(<EventForm submitLabel="Registrar" onSubmit={vi.fn()} />);

    expect(screen.getByText('Início do Evento')).toBeDefined();
    expect(screen.getByText('Término do Evento')).toBeDefined();
    expect(screen.getByText('Cálculo automático')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Registrar' })).toBeDefined();
  });

  it('automatically calculates end time when start date, start time and workload are entered', async () => {
    render(<EventForm submitLabel="Registrar" onSubmit={vi.fn()} />);

    const inputs = screen.getAllByRole('textbox');
    // Inputs: Título [0], Palestrante [1], Local [2], Carga horária [3]
    fireEvent.change(inputs[3], { target: { value: '2' } });

    // Date/time inputs

    // Use container selectors for date and time inputs
    const dateInputs = document.querySelectorAll('input[type="date"]');
    const timeInputs = document.querySelectorAll('input[type="time"]');

    fireEvent.change(dateInputs[0], { target: { value: '2026-10-05' } });
    fireEvent.change(timeInputs[0], { target: { value: '19:00' } });

    await waitFor(() => {
      expect((dateInputs[1] as HTMLInputElement).value).toBe('2026-10-05');
      expect((timeInputs[1] as HTMLInputElement).value).toBe('21:00');
    });
  });

  it('switches to manual mode when user manually changes end date or time', async () => {
    render(<EventForm submitLabel="Registrar" onSubmit={vi.fn()} />);

    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[3], { target: { value: '2' } });

    const dateInputs = document.querySelectorAll('input[type="date"]');
    const timeInputs = document.querySelectorAll('input[type="time"]');

    fireEvent.change(dateInputs[0], { target: { value: '2026-10-05' } });
    fireEvent.change(timeInputs[0], { target: { value: '19:00' } });

    await waitFor(() => {
      expect((timeInputs[1] as HTMLInputElement).value).toBe('21:00');
    });

    // Modifica o fim manualmente
    fireEvent.change(timeInputs[1], { target: { value: '22:00' } });

    // Deve exibir o botão de recalcular
    expect(screen.getByText('Recalcular término')).toBeDefined();
    expect((timeInputs[1] as HTMLInputElement).value).toBe('22:00');

    // Ao clicar em recalcular término, volta a calcular
    fireEvent.click(screen.getByText('Recalcular término'));
    await waitFor(() => {
      expect((timeInputs[1] as HTMLInputElement).value).toBe('21:00');
    });
  });

  it('preserves saved end date and time on edit mode (initialValue)', () => {
    const mockEvent: EventView = {
      id: 'evt-123',
      title: 'Palestra Salva',
      description: 'Descrição salva',
      speaker: 'Prof. Exemplo',
      location: 'Auditório 1',
      startsAt: '2026-10-05T19:00:00.000Z',
      endsAt: '2026-10-05T22:30:00.000Z', // 3h30 ao invés das 2h da carga
      workloadMinutes: 120, // 2h
      status: 'SCHEDULED',
      certificateEnabled: true,
      checkpoints: [],
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
      cancelReason: null,
      cancelledAt: null,
      cancelledById: null,
    };

    render(
      <EventForm
        initialValue={mockEvent}
        submitLabel="Salvar Alterações"
        onSubmit={vi.fn()}
      />
    );

    // Deve estar no modo manual por padrão
    expect(screen.getByText('Recalcular término')).toBeDefined();

    // Valores mantidos
    const inputs = screen.getAllByRole('textbox');
    expect((inputs[0] as HTMLInputElement).value).toBe('Palestra Salva');
    expect((inputs[1] as HTMLInputElement).value).toBe('Prof. Exemplo');
    expect((inputs[3] as HTMLInputElement).value).toBe('2');
  });

  it('validates fields and calls onSubmit when valid', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EventForm submitLabel="Registrar" onSubmit={onSubmit} />);

    // Tenta submeter vazio
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    expect(await screen.findByRole('alert')).toBeDefined();
    expect(onSubmit).not.toHaveBeenCalled();

    // Preenche campos válidos
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'Workshop de React' } });
    fireEvent.change(inputs[1], { target: { value: 'Especialista Web' } });
    fireEvent.change(inputs[2], { target: { value: 'Laboratório 3' } });
    fireEvent.change(inputs[3], { target: { value: '2' } });

    const dateInputs = document.querySelectorAll('input[type="date"]');
    const timeInputs = document.querySelectorAll('input[type="time"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-10-05' } });
    fireEvent.change(timeInputs[0], { target: { value: '19:00' } });

    await waitFor(() => {
      expect((timeInputs[1] as HTMLInputElement).value).toBe('21:00');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Workshop de React',
          speaker: 'Especialista Web',
          location: 'Laboratório 3',
          workloadMinutes: 120,
        })
      );
    });
  });
});
