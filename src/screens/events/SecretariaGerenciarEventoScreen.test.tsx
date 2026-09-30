import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
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
    const getQrSpy = vi.spyOn(checkpointService, 'getCheckpointQr').mockResolvedValue({
      qrToken: 'legacy.jwt.token',
      qrUrl: 'https://carteirinha-digital-front-end-aluno.vercel.app/p/shortRef123456',
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
      return {
        qrToken: `token-${callCount}`,
        qrUrl: `https://carteirinha-digital-front-end-aluno.vercel.app/p/ref-${callCount}`,
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
    getQrSpy.mockResolvedValueOnce({
      qrToken: 'token-expiring',
      qrUrl: 'https://carteirinha-digital-front-end-aluno.vercel.app/p/ref-expiring',
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
});


