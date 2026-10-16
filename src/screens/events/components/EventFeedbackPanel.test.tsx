import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EventFeedbackPanel } from './EventFeedbackPanel';
import * as publicEventService from '../../../api/event/publicEventService';

vi.mock('../../../api/event/publicEventService', () => ({
  getEventFeedback: vi.fn(),
}));

describe('EventFeedbackPanel Component', () => {
  const mockMetrics: publicEventService.EventFeedbackMetrics = {
    eventId: 'evt-123',
    totalResponses: 3,
    averageRating: 4.7,
    ratingDistribution: {
      1: 0,
      2: 0,
      3: 0,
      4: 1,
      5: 2,
    },
    feedbacks: [
      {
        id: 'fb-1',
        rating: 5,
        comments: 'Palestra excepcional e muito didática!',
        suggestions: 'Trazer mais oficinas práticas de IA.',
        createdAt: '2026-10-16T19:30:00.000Z',
      },
      {
        id: 'fb-2',
        rating: 5,
        comments: 'Excelente conteúdo e palestrante muito preparado.',
        suggestions: null,
        createdAt: '2026-10-16T19:40:00.000Z',
      },
      {
        id: 'fb-3',
        rating: 4,
        comments: null,
        suggestions: 'Disponibilizar os slides após o evento.',
        createdAt: '2026-10-16T20:00:00.000Z',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe estado de carregamento inicial', () => {
    vi.mocked(publicEventService.getEventFeedback).mockReturnValue(
      new Promise(() => {}) // never resolves
    );

    render(<EventFeedbackPanel eventId="evt-123" />);
    expect(screen.getByText('Carregando métricas de satisfação...')).toBeInTheDocument();
  });

  it('exibe mensagem quando não há avaliações registradas', async () => {
    vi.mocked(publicEventService.getEventFeedback).mockResolvedValue({
      eventId: 'evt-123',
      totalResponses: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      feedbacks: [],
    });

    render(<EventFeedbackPanel eventId="evt-123" />);

    await waitFor(() => {
      expect(screen.getByText('Nenhuma avaliação registrada ainda')).toBeInTheDocument();
    });
  });

  it('renderiza métricas agregadas e selo de garantia de anonimato', async () => {
    vi.mocked(publicEventService.getEventFeedback).mockResolvedValue(mockMetrics);

    render(<EventFeedbackPanel eventId="evt-123" />);

    await waitFor(() => {
      expect(screen.getByText('4.7')).toBeInTheDocument();
    });

    expect(screen.getByText('Baseado em 3 avaliações')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument(); // 3 out of 3 are 4 or 5 stars
    expect(screen.getAllByText('Respostas 100% Anônimas').length).toBeGreaterThan(0);
    expect(screen.getByText(/Garantia de Anonimato Institucional/i)).toBeInTheDocument();
  });

  it('renderiza os feedbacks com selo anônimo e sem dados pessoais', async () => {
    vi.mocked(publicEventService.getEventFeedback).mockResolvedValue(mockMetrics);

    render(<EventFeedbackPanel eventId="evt-123" />);

    await waitFor(() => {
      expect(screen.getByText('Palestra excepcional e muito didática!')).toBeInTheDocument();
    });

    expect(screen.getByText('Trazer mais oficinas práticas de IA.')).toBeInTheDocument();
    expect(screen.getAllByText('Participante Anônimo')).toHaveLength(3);

    // Garante ausência total de RA, CPF ou identificação pessoal de participante
    expect(screen.queryByText(/\bRA:\b/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\bCPF:\b/i)).not.toBeInTheDocument();
    expect(screen.queryByText('001234')).not.toBeInTheDocument();
  });

  it('permite filtrar feedbacks por nota de estrela', async () => {
    vi.mocked(publicEventService.getEventFeedback).mockResolvedValue(mockMetrics);

    render(<EventFeedbackPanel eventId="evt-123" />);

    await waitFor(() => {
      expect(screen.getByText('Palestra excepcional e muito didática!')).toBeInTheDocument();
    });

    // Clica no chip para filtrar apenas 4 estrelas
    const chip4 = screen.getByRole('button', { name: /4 ★/i });
    fireEvent.click(chip4);

    // Apenas o feedback de nota 4 deve aparecer
    expect(screen.queryByText('Palestra excepcional e muito didática!')).not.toBeInTheDocument();
    expect(screen.getByText('Disponibilizar os slides após o evento.')).toBeInTheDocument();

    // Volta para todas
    const chipAll = screen.getByRole('button', { name: /Todas \(3\)/i });
    fireEvent.click(chipAll);

    expect(screen.getByText('Palestra excepcional e muito didática!')).toBeInTheDocument();
  });

  it('exibe estado de erro e permite tentar novamente', async () => {
    vi.mocked(publicEventService.getEventFeedback)
      .mockRejectedValueOnce(new Error('Erro de conexão com o servidor'))
      .mockResolvedValueOnce(mockMetrics);

    render(<EventFeedbackPanel eventId="evt-123" />);

    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar métricas')).toBeInTheDocument();
      expect(screen.getByText('Erro de conexão com o servidor')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /Tentar novamente/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('4.7')).toBeInTheDocument();
    });
  });
});
