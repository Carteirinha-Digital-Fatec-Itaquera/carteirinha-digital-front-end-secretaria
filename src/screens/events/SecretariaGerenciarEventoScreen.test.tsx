import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SecretariaGerenciarEventoScreen from './SecretariaGerenciarEventoScreen';
import * as eventService from '../../api/event/eventService';
import * as checkpointService from '../../api/event/checkpointService';
import * as useEventParticipantsHook from './hooks/useEventParticipants';

vi.mock('../../components/menuLateral/MenuLateral', () => ({
  default: () => <div data-testid="mock-menu-lateral">MenuLateral</div>,
}));

vi.mock('./components/ParticipantsPanel', () => ({
  ParticipantsPanel: () => <div data-testid="mock-participants-panel">ParticipantsPanel</div>,
}));

vi.mock('./components/RafflePanel', () => ({
  RafflePanel: () => <div data-testid="mock-raffle-panel">RafflePanel</div>,
}));

describe('SecretariaGerenciarEventoScreen - QR Code & Projeção Telão', () => {
  const fakeEvent = {
    id: 'evt-test-100',
    title: 'Semana de Tecnologia 2026',
    description: 'Evento tech',
    speaker: 'Prof. Exemplo',
    location: 'Auditório Principal',
    startsAt: '2026-10-10T10:00:00.000Z',
    endsAt: '2026-10-10T18:00:00.000Z',
    workloadMinutes: 120,
    status: 'IN_PROGRESS' as const,
    certificateEnabled: true,
    cancelReason: null,
    cancelledAt: null,
    cancelledById: null,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    checkpoints: [
      {
        id: 'cp-in',
        eventId: 'evt-test-100',
        type: 'CHECK_IN' as const,
        isOpen: true,
        version: 1,
        openedAt: '2026-10-10T10:00:00.000Z',
        closedAt: null,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    vi.spyOn(eventService, 'getEvent').mockResolvedValue(fakeEvent);
    vi.spyOn(useEventParticipantsHook, 'useEventParticipants').mockReturnValue({
      items: [],
      summary: null,
      loading: false,
      refreshing: false,
      stale: false,
      error: null,
      lastUpdatedAt: null,
      refresh: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exibe QR Code preferencialmente com qrUrl curto e botão Modo Telão', async () => {
    const validRef = 'shortRef123456'.padEnd(22, '0');
    const getQrSpy = vi.spyOn(checkpointService, 'getCheckpointQr').mockResolvedValue({
      qrToken: 'legacy.jwt.token',
      qrUrl: `https://carteirinha-digital-front-end-aluno.vercel.app/p/${validRef}`,
      serverTime: new Date().toISOString(),
      expiresInSeconds: 20,
      expiresAt: new Date(Date.now() + 20000).toISOString(),
      checkpointVersion: 1,
    });

    render(
      <MemoryRouter initialEntries={['/eventos/evt-test-100/gerenciar']}>
        <Routes>
          <Route path="/eventos/:id/gerenciar" element={<SecretariaGerenciarEventoScreen />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Semana de Tecnologia 2026')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(getQrSpy).toHaveBeenCalledWith('evt-test-100', 'CHECK_IN', expect.any(Object));
    });

    // Verifica que botão Modo Telão está presente
    const telaoButton = screen.getByRole('button', { name: /Modo Telão/i });
    expect(telaoButton).toBeInTheDocument();

    // Abre modo telão
    fireEvent.click(telaoButton);

    expect(screen.getByText('Sair do Telão (ESC)')).toBeInTheDocument();
    expect(screen.getByText('Renovação preventiva em:')).toBeInTheDocument();
  });

  it('faz renovação preventiva aos 15 segundos sem requisições sobrepostas', async () => {
    const now = Date.now();
    let callCount = 0;

    const getQrSpy = vi.spyOn(checkpointService, 'getCheckpointQr').mockImplementation(async () => {
      callCount++;
      const ref = `mockRef${callCount}`.padEnd(22, '0');
      return {
        qrToken: `token-${callCount}`,
        qrUrl: `https://carteirinha-digital-front-end-aluno.vercel.app/p/${ref}`,
        serverTime: new Date(now).toISOString(),
        expiresInSeconds: 20,
        expiresAt: new Date(Date.now() + 20000).toISOString(),
        checkpointVersion: 1,
      };
    });

    render(
      <MemoryRouter initialEntries={['/eventos/evt-test-100/gerenciar']}>
        <Routes>
          <Route path="/eventos/:id/gerenciar" element={<SecretariaGerenciarEventoScreen />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getQrSpy).toHaveBeenCalledTimes(1);
    });

    // Avança 15.5 segundos no tempo (faltando < 5s para expirar)
    await act(async () => {
      vi.advanceTimersByTime(15500);
    });

    // Deve ter disparado a renovação preventiva antes da expiração
    await waitFor(() => {
      expect(getQrSpy).toHaveBeenCalledTimes(2);
    });
  });

  it('limpa o QR Code da tela se expirar antes de renovar para evitar leituras inválidas', async () => {
    const now = Date.now();
    const getQrSpy = vi.spyOn(checkpointService, 'getCheckpointQr');
    const expiringRef = 'expiringRef'.padEnd(22, '0');
    getQrSpy.mockResolvedValueOnce({
      qrToken: 'token-expiring',
      qrUrl: `https://carteirinha-digital-front-end-aluno.vercel.app/p/${expiringRef}`,
      serverTime: new Date(now).toISOString(),
      expiresInSeconds: 2,
      expiresAt: new Date(now + 2000).toISOString(),
      checkpointVersion: 1,
    });
    // Segunda chamada (renovação) fica pendente
    getQrSpy.mockReturnValueOnce(new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={['/eventos/evt-test-100/gerenciar']}>
        <Routes>
          <Route path="/eventos/:id/gerenciar" element={<SecretariaGerenciarEventoScreen />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getQrSpy).toHaveBeenCalledTimes(1);
    });

    // Avança 2.5s para expirar o QR
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    // O QR vencido foi limpo da tela, mostrando estado de renovação
    expect(
      screen.getByText(/Renovando QR Code\.\.\.|Aguardando novo QR Code\.\.\./i)
    ).toBeInTheDocument();
  });

  it('renderiza o SVG com data-testid="attendance-qr" quando a qrUrl for válida', async () => {
    const validRef = 'a'.repeat(22);
    vi.spyOn(checkpointService, 'getCheckpointQr').mockResolvedValueOnce({
      qrToken: 'legacy.jwt.token',
      qrUrl: `https://carteirinha-digital-front-end-aluno.vercel.app/p/${validRef}`,
      serverTime: new Date().toISOString(),
      expiresInSeconds: 20,
      expiresAt: new Date(Date.now() + 20000).toISOString(),
      checkpointVersion: 1,
    });

    render(
      <MemoryRouter initialEntries={['/eventos/evt-test-100/gerenciar']}>
        <Routes>
          <Route path="/eventos/:id/gerenciar" element={<SecretariaGerenciarEventoScreen />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('attendance-qr')).toBeInTheDocument();
    });
  });

  it('não renderiza o SVG e exibe erro com retry quando qrUrl estiver ausente mesmo se qrToken existir', async () => {
    vi.spyOn(checkpointService, 'getCheckpointQr').mockResolvedValueOnce({
      qrToken: 'legacy.jwt.token.only',
      // qrUrl ausente
      serverTime: new Date().toISOString(),
      expiresInSeconds: 20,
      expiresAt: new Date(Date.now() + 20000).toISOString(),
      checkpointVersion: 1,
    });

    render(
      <MemoryRouter initialEntries={['/eventos/evt-test-100/gerenciar']}>
        <Routes>
          <Route path="/eventos/:id/gerenciar" element={<SecretariaGerenciarEventoScreen />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Não foi possível gerar o link de presença\. Tente atualizar\./i)
      ).toBeInTheDocument();
    });

    // Garante que o SVG com o QR não é renderizado com JWT silencioso
    expect(screen.queryByTestId('attendance-qr')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tentar novamente/i })).toBeInTheDocument();
  });

  it('não renderiza o SVG e exibe erro quando qrUrl tiver origem não autorizada', async () => {
    const validRef = 'a'.repeat(22);
    vi.spyOn(checkpointService, 'getCheckpointQr').mockResolvedValueOnce({
      qrToken: 'legacy.jwt.token',
      qrUrl: `https://malicious-site.com/p/${validRef}`,
      serverTime: new Date().toISOString(),
      expiresInSeconds: 20,
      expiresAt: new Date(Date.now() + 20000).toISOString(),
      checkpointVersion: 1,
    });

    render(
      <MemoryRouter initialEntries={['/eventos/evt-test-100/gerenciar']}>
        <Routes>
          <Route path="/eventos/:id/gerenciar" element={<SecretariaGerenciarEventoScreen />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Não foi possível gerar o link de presença\. Tente atualizar\./i)
      ).toBeInTheDocument();
    });

    expect(screen.queryByTestId('attendance-qr')).not.toBeInTheDocument();
  });

  it('exibe botões de editar e cancelar e permite cancelar evento abrindo modal', async () => {
    const cancelSpy = vi.spyOn(eventService, 'cancelEvent').mockResolvedValue({
      ...fakeEvent,
      status: 'CANCELLED',
      cancelReason: 'Auditório interditado para reparos',
      cancelledAt: '2026-10-10T12:00:00.000Z',
      cancelledById: 1,
    });

    render(
      <MemoryRouter initialEntries={['/eventos/evt-test-100/gerenciar']}>
        <Routes>
          <Route path="/eventos/:id/gerenciar" element={<SecretariaGerenciarEventoScreen />} />
          <Route path="/eventos/:id/editar" element={<div>Tela de Edição do Evento</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /editar evento/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancelar evento/i })).toBeInTheDocument();
    });

    // Clica no botão Cancelar Evento
    const cancelBtn = screen.getByRole('button', { name: /cancelar evento/i });
    fireEvent.click(cancelBtn);

    // Modal de cancelamento deve abrir
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Semana de Tecnologia 2026')).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/Informe o motivo formal do cancelamento/i);
    fireEvent.change(textarea, { target: { value: 'Auditório interditado para reparos' } });

    const confirmBtn = screen.getByRole('button', { name: 'Confirmar Cancelamento' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(cancelSpy).toHaveBeenCalledWith('evt-test-100', {
        reason: 'Auditório interditado para reparos',
      });
    });
  });

  it('exibe banner de evento cancelado e bloqueia abertura de checkpoints quando status é CANCELLED', async () => {
    vi.spyOn(eventService, 'getEvent').mockResolvedValue({
      ...fakeEvent,
      status: 'CANCELLED',
      cancelReason: 'Evento adiado indefinidamente',
      cancelledAt: '2026-10-10T12:00:00.000Z',
      cancelledById: 1,
      checkpoints: [
        {
          id: 'cp-in',
          eventId: 'evt-test-100',
          type: 'CHECK_IN' as const,
          isOpen: false,
          version: 1,
          openedAt: '2026-10-10T10:00:00.000Z',
          closedAt: '2026-10-10T10:30:00.000Z',
        },
        {
          id: 'cp-out',
          eventId: 'evt-test-100',
          type: 'CHECK_OUT' as const,
          isOpen: false,
          version: 1,
          openedAt: null,
          closedAt: null,
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={['/eventos/evt-test-100/gerenciar']}>
        <Routes>
          <Route path="/eventos/:id/gerenciar" element={<SecretariaGerenciarEventoScreen />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Evento Cancelado')).toBeInTheDocument();
      expect(screen.getByText(/Evento adiado indefinidamente/i)).toBeInTheDocument();
    });

    // Botões de editar e cancelar da topBar não devem estar visíveis
    expect(screen.queryByRole('button', { name: /editar evento/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancelar evento/i })).not.toBeInTheDocument();

    // Mensagem de bloqueio nos checkpoints
    expect(
      screen.getByText(/Evento cancelado\. Novos checkpoints não podem ser abertos\./i)
    ).toBeInTheDocument();
  });
});


