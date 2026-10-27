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
    {
      id: 'evt-3',
      title: 'Workshop Mais Atual de IA',
      description: null,
      speaker: 'Ana IA',
      location: 'Auditório Principal',
      startsAt: '2026-10-15T18:00:00.000Z',
      endsAt: '2026-10-15T20:00:00.000Z',
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
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-01T12:00:00-03:00'));
  });

  it('renders active events by default and displays cancelled events only in cancelled tab', async () => {
    vi.spyOn(eventService, 'getEvents').mockResolvedValue(fakeEvents);

    render(
      <MemoryRouter initialEntries={['/eventos']}>
        <Routes>
          <Route path="/eventos" element={<SecretariaEventosScreen />} />
        </Routes>
      </MemoryRouter>
    );

    // Aguarda carregar
    await waitFor(() => {
      expect(screen.getByText('Workshop Mais Atual de IA')).toBeInTheDocument();
      expect(screen.getByText('Workshop de Cloud')).toBeInTheDocument();
    });

    // Evento cancelado não deve aparecer na aba de ativos
    expect(screen.queryByText('Palestra Cancelada de IoT')).not.toBeInTheDocument();

    // Contadores das abas
    expect(screen.getByRole('tab', { name: /Eventos Ativos/i })).toHaveTextContent('2');
    expect(screen.getByRole('tab', { name: /Eventos Cancelados/i })).toHaveTextContent('1');

    // Troca para a aba de cancelados
    const cancelledTab = screen.getByRole('tab', { name: /Eventos Cancelados/i });
    fireEvent.click(cancelledTab);

    // Agora o evento cancelado aparece e os ativos somem da lista
    await waitFor(() => {
      expect(screen.getByText('Palestra Cancelada de IoT')).toBeInTheDocument();
      expect(screen.getByText('Cancelado')).toBeInTheDocument();
      expect(screen.getByText(/Palestrante em viagem imprevista/i)).toBeInTheDocument();
    });

    expect(screen.queryByText('Workshop Mais Atual de IA')).not.toBeInTheDocument();
    expect(screen.queryByText('Workshop de Cloud')).not.toBeInTheDocument();
  });

  it('orders upcoming events by nearest date by default and allows newest first', async () => {
    vi.spyOn(eventService, 'getEvents').mockResolvedValue(fakeEvents);

    render(
      <MemoryRouter initialEntries={['/eventos']}>
        <Routes>
          <Route path="/eventos" element={<SecretariaEventosScreen />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Workshop Mais Atual de IA')).toBeInTheDocument();
    });

    // Padrão: próximo início primeiro, independentemente da ordem da API.
    const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titles[0]).toBe('Workshop de Cloud');
    expect(titles[1]).toBe('Workshop Mais Atual de IA');

    // Alterna para ordenação "Mais atuais primeiro"
    const sortSelect = screen.getByRole('combobox', { name: /ordenar por data/i });
    fireEvent.change(sortSelect, { target: { value: 'recent' } });

    const updatedTitles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(updatedTitles[0]).toBe('Workshop Mais Atual de IA');
    expect(updatedTitles[1]).toBe('Workshop de Cloud');
  });

  it('separates past and explicitly completed events, keeping cancellations exclusive', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-13T12:00:00-03:00'));
    vi.spyOn(eventService, 'getEvents').mockResolvedValue([
      ...fakeEvents,
      { ...fakeEvents[2], id: 'completed', title: 'Finalizado antecipadamente', status: 'COMPLETED' },
    ]);
    render(<MemoryRouter><SecretariaEventosScreen /></MemoryRouter>);
    await screen.findByText('Workshop Mais Atual de IA');
    expect(screen.getByRole('tab', { name: /Eventos Ativos/i })).toHaveTextContent('1');
    expect(screen.getByRole('tab', { name: /Eventos Concluídos/i })).toHaveTextContent('2');
    expect(screen.getByRole('tab', { name: /Eventos Cancelados/i })).toHaveTextContent('1');
    expect(screen.queryByText('Workshop de Cloud')).not.toBeInTheDocument();
    // Filtro de checkpoint dos ativos não deve esconder o histórico.
    fireEvent.change(screen.getByRole('combobox', { name: /Filtrar por status/i }), { target: { value: 'open' } });
    fireEvent.click(screen.getByRole('tab', { name: /Eventos Concluídos/i }));
    expect(screen.getByText('Workshop de Cloud')).toBeInTheDocument();
    expect(screen.getByText('Finalizado antecipadamente')).toBeInTheDocument();
    expect(screen.queryByText('Palestra Cancelada de IoT')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Acessar Evento' })).toHaveLength(2);
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar eventos' }), { target: { value: 'Maria' } });
    expect(screen.queryByText('Finalizado antecipadamente')).not.toBeInTheDocument();
    expect(screen.getByText('Workshop de Cloud')).toBeInTheDocument();
  });

  it('keeps an ongoing event before upcoming events until its end instant in Brasilia', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-27T00:59:59Z'));
    vi.spyOn(eventService, 'getEvents').mockResolvedValue([
      { ...fakeEvents[2], title: 'Amanhã cedo', startsAt: '2026-10-27T08:00:00-03:00', endsAt: '2026-10-27T09:00:00-03:00' },
      { ...fakeEvents[0], title: 'Atividade em andamento', startsAt: '2026-10-26T21:00:00-03:00', endsAt: '2026-10-26T22:00:00-03:00' },
    ]);
    render(<MemoryRouter><SecretariaEventosScreen /></MemoryRouter>);
    await screen.findByText('Atividade em andamento');
    expect(screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual(['Atividade em andamento', 'Amanhã cedo']);
    expect(screen.getByText(/Horário de Brasília/)).toBeInTheDocument();
    clock.mockReturnValue(Date.parse('2026-10-27T01:00:00Z'));
    fireEvent(window, new Event('focus'));
    await waitFor(() => expect(screen.queryByText('Atividade em andamento')).not.toBeInTheDocument());
    expect(screen.getByRole('tab', { name: /Eventos Concluídos/i })).toHaveTextContent('1');
    fireEvent.click(screen.getByRole('tab', { name: /Eventos Concluídos/i }));
    expect(screen.getByText('Atividade em andamento')).toBeInTheDocument();
  });

  it('shows an empty completed tab without losing the create action', async () => {
    vi.spyOn(eventService, 'getEvents').mockResolvedValue(fakeEvents);
    render(<MemoryRouter><SecretariaEventosScreen /></MemoryRouter>);
    await screen.findByText('Workshop de Cloud');
    fireEvent.click(screen.getByRole('tab', { name: /Eventos Concluídos/i }));
    expect(screen.getByText('Nenhum evento concluído encontrado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Novo Evento/i })).toBeInTheDocument();
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
      expect(screen.getByText('Workshop de Cloud')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button', { name: /editar/i });
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Tela de Edição')).toBeInTheDocument();
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
      expect(screen.getByText('Workshop Mais Atual de IA')).toBeInTheDocument();
    });

    const cancelButtons = screen.getAllByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelButtons[0]);

    // Modal aberto
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Cancelar Evento')).toBeInTheDocument();

    // Preenche motivo e confirma
    const textarea = screen.getByPlaceholderText(/Informe o motivo formal do cancelamento/i);
    fireEvent.change(textarea, { target: { value: 'Falta de energia no prédio' } });

    const confirmBtn = screen.getByRole('button', { name: 'Confirmar Cancelamento' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(cancelSpy).toHaveBeenCalled();
    });

    // Mensagem de sucesso
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/cancelado com sucesso/i)).toBeInTheDocument();
    });
  });

  it('opens delete dialog and deletes event when confirmed', async () => {
    vi.spyOn(eventService, 'getEvents').mockResolvedValue(fakeEvents);
    const deleteSpy = vi.spyOn(eventService, 'deleteEvent').mockResolvedValue({
      message: 'Evento excluído com sucesso',
    });

    render(
      <MemoryRouter initialEntries={['/eventos']}>
        <Routes>
          <Route path="/eventos" element={<SecretariaEventosScreen />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Workshop Mais Atual de IA')).toBeInTheDocument();
    });

    // Pega o botão excluir do primeiro evento
    const deleteButtons = screen.getAllByRole('button', { name: /excluir/i });
    fireEvent.click(deleteButtons[0]);

    // Modal de exclusão aberto
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Excluir Evento' })).toBeInTheDocument();
    expect(screen.getByText(/ação é irreversível/i)).toBeInTheDocument();

    // Confirma exclusão
    const confirmDeleteBtn = screen.getByRole('button', { name: 'Excluir Evento' });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('evt-1');
    });

    // Mensagem de sucesso
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/excluído com sucesso/i)).toBeInTheDocument();
    });
  });
});
