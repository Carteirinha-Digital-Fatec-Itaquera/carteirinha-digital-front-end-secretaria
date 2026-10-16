import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ParticipantsPanel } from './ParticipantsPanel';
import type { AttendanceView } from '../../../domains/Attendance';
import * as publicEventService from '../../../api/event/publicEventService';

describe('ParticipantsPanel Component', () => {
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

  it('exibe estado de carregamento', () => {
    render(
      <ParticipantsPanel
        items={[]}
        loading={true}
        refreshing={false}
        stale={false}
        error={null}
        lastUpdatedAt={null}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText('Carregando participantes...')).toBeInTheDocument();
  });

  it('exibe estado vazio quando nao ha participantes', () => {
    render(
      <ParticipantsPanel
        items={[]}
        loading={false}
        refreshing={false}
        stale={false}
        error={null}
        lastUpdatedAt={null}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText('Nenhum participante registrado até o momento.')).toBeInTheDocument();
  });

  it('renderiza participantes reais com status correto e travessao na saida nula', () => {
    render(
      <ParticipantsPanel
        items={[fakeConfirmed, fakeCheckedIn]}
        loading={false}
        refreshing={false}
        stale={false}
        error={null}
        lastUpdatedAt={null}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('001234')).toBeInTheDocument();
    expect(screen.getByText('Presença confirmada')).toBeInTheDocument();

    expect(screen.getByText('Bruno Lima')).toBeInTheDocument();
    expect(screen.getByText('005678')).toBeInTheDocument();
    expect(screen.getByText('Aguardando saída')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('exibe aviso de dados em cache quando stale=true', () => {
    render(
      <ParticipantsPanel
        items={[fakeConfirmed]}
        loading={false}
        refreshing={false}
        stale={true}
        error="Erro de conexão"
        lastUpdatedAt={new Date('2026-10-05T20:00:00.000Z')}
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByText(/Exibindo dados em cache/i)).toBeInTheDocument();
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
  });

  it('aciona callback onRefresh ao clicar no botao Atualizar', () => {
    const handleRefresh = vi.fn();
    render(
      <ParticipantsPanel
        items={[fakeConfirmed]}
        loading={false}
        refreshing={false}
        stale={false}
        error={null}
        lastUpdatedAt={null}
        onRefresh={handleRefresh}
      />
    );

    const button = screen.getByRole('button', { name: /Atualizar lista de participantes/i });
    fireEvent.click(button);

    expect(handleRefresh).toHaveBeenCalledTimes(1);
  });

  it('renderiza logs de auditoria traduzidos para linguagem amigável quando eventId é fornecido', async () => {
    const fakeAuditLogs = [
      {
        id: 'aud-1',
        action: 'CHECKPOINT_OPEN_CHECK_IN',
        secretaryId: 1,
        reason: null,
        createdAt: '2026-10-16T14:00:00.000Z',
      },
      {
        id: 'aud-2',
        action: 'MANUAL_CHECK_IN',
        secretaryId: 1,
        reason: 'Aluno sem bateria no celular',
        createdAt: '2026-10-16T14:10:00.000Z',
      },
      {
        id: 'aud-3',
        action: 'CHECKPOINT_CLOSE_CHECK_IN',
        secretaryId: 1,
        reason: null,
        createdAt: '2026-10-16T14:45:00.000Z',
      },
    ];

    vi.spyOn(publicEventService, 'management').mockImplementation((path: string) => {
      if (path.includes('/participants')) {
        return Promise.resolve([]);
      }
      if (path.includes('/audit')) {
        return Promise.resolve(fakeAuditLogs);
      }
      return Promise.resolve([]);
    });

    render(
      <ParticipantsPanel
        items={[fakeConfirmed]}
        loading={false}
        refreshing={false}
        stale={false}
        error={null}
        lastUpdatedAt={null}
        onRefresh={vi.fn()}
        eventId="evt-100"
      />
    );

    expect(await screen.findByText('Histórico de Atendimento Presencial e Auditoria')).toBeInTheDocument();
    expect(screen.getByText(/Check-in \(Entrada\) aberto/i)).toBeInTheDocument();
    expect(screen.getByText(/Presença confirmada manualmente pela secretaria \(Entrada\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Motivo: "Aluno sem bateria no celular"/i)).toBeInTheDocument();
    expect(screen.getByText(/Check-in \(Entrada\) encerrado/i)).toBeInTheDocument();
  });
});
