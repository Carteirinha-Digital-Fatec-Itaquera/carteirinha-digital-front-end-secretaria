import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RafflePanel } from './RafflePanel';
import type { AttendanceView } from '../../../domains/Attendance';

describe('RafflePanel Component', () => {
  const fakeConfirmed: AttendanceView = {
    id: 'att-1',
    eventId: 'evt-1',
    eventTitle: 'Workshop',
    studentRa: '001234',
    studentName: 'Ana Souza',
    studentCourse: 'DSM',
    status: 'CONFIRMED',
    checkInAt: '2026-10-05T19:00:00.000Z',
    checkOutAt: '2026-10-05T21:00:00.000Z',
  };

  const fakeCheckedIn: AttendanceView = {
    id: 'att-2',
    eventId: 'evt-1',
    eventTitle: 'Workshop',
    studentRa: '005678',
    studentName: 'Bruno Lima',
    studentCourse: 'GTI',
    status: 'CHECKED_IN',
    checkInAt: '2026-10-05T19:15:00.000Z',
    checkOutAt: null,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exibe aviso e desabilita botao quando nao ha participantes confirmados', () => {
    render(
      <RafflePanel
        items={[fakeCheckedIn]}
        loading={false}
        refreshing={false}
        onRefresh={vi.fn().mockResolvedValue([fakeCheckedIn])}
      />
    );

    expect(screen.getByText(/Nenhum participante com presença confirmada/i)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /Realizar Sorteio/i });
    expect(button).toBeDisabled();
  });

  it('refreshesBeforeDrawing e waitsTwoSeconds antes de exibir o vencedor', async () => {
    vi.useFakeTimers();

    const onRefreshMock = vi.fn().mockResolvedValue([fakeConfirmed]);

    render(
      <RafflePanel
        items={[fakeConfirmed]}
        loading={false}
        refreshing={false}
        onRefresh={onRefreshMock}
      />
    );

    const button = screen.getByRole('button', { name: /Realizar Sorteio/i });
    expect(button).not.toBeDisabled();

    // Clica no sorteio
    await act(async () => {
      fireEvent.click(button);
    });

    expect(onRefreshMock).toHaveBeenCalledTimes(1);

    // Estado intermediario de suspense
    expect(screen.getByText(/Sorteando entre os participantes/i)).toBeInTheDocument();
    expect(screen.queryByText(/Vencedor\(a\) Sorteado\(a\)!/i)).not.toBeInTheDocument();

    // Avanca 1999ms -> ainda sem vencedor
    await act(async () => {
      vi.advanceTimersByTime(1999);
    });
    expect(screen.queryByText(/Vencedor\(a\) Sorteado\(a\)!/i)).not.toBeInTheDocument();

    // Avanca mais 1ms (total 2000ms) -> vencedor anunciado
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByText(/Vencedor\(a\) Sorteado\(a\)!/i)).toBeInTheDocument();
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
  });

  it('refreshFailureDoesNotDraw: falha de refresh exibe erro e nao sorteia vencedor', async () => {
    const onRefreshMock = vi.fn().mockRejectedValue(new Error('Falha de rede'));

    render(
      <RafflePanel
        items={[fakeConfirmed]}
        loading={false}
        refreshing={false}
        onRefresh={onRefreshMock}
      />
    );

    const button = screen.getByRole('button', { name: /Realizar Sorteio/i });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(onRefreshMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Falha ao atualizar participantes antes do sorteio/i)).toBeInTheDocument();
    expect(screen.queryByText(/Vencedor\(a\) Sorteado\(a\)!/i)).not.toBeInTheDocument();
  });

  it('duplo clique nao dispara dois sorteios concorrentes', async () => {
    vi.useFakeTimers();
    const onRefreshMock = vi.fn().mockResolvedValue([fakeConfirmed]);

    render(
      <RafflePanel
        items={[fakeConfirmed]}
        loading={false}
        refreshing={false}
        onRefresh={onRefreshMock}
      />
    );

    const button = screen.getByRole('button', { name: /Realizar Sorteio/i });

    await act(async () => {
      fireEvent.click(button);
      fireEvent.click(button); // duplo clique imediato
    });

    expect(onRefreshMock).toHaveBeenCalledTimes(1);
  });
});
