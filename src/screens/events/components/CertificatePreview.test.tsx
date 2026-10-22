import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CertificatePreview } from './CertificatePreview';
import type { Template, Signer } from '../../../api/event/publicEventService';

describe('CertificatePreview Component', () => {
  const mockTemplate: Template = {
    id: 'tmpl-1',
    name: 'XIII Semana de Tecnologia — Participante',
    role: 'ATTENDEE',
    version: 1,
    status: 'PUBLISHED',
    config: {
      heading: 'CERTIFICADO',
      edition: "XIII Semana de Tecnologia da Fatec Itaquera 'Professor Miguel Reale'",
    },
  };

  const mockSigners: Signer[] = [
    {
      id: 'sig-1',
      name: 'Prof. Dr. Roberto Mendes',
      title: 'Diretor da Fatec Itaquera',
      archived: false,
      assetId: 'asset-sig-1',
    },
    {
      id: 'sig-2',
      name: 'Profa. Dra. Ana Clara',
      title: 'Coordenadora de Eventos',
      archived: false,
      assetId: 'asset-sig-2',
    },
  ];

  it('deve renderizar a marca d água PRÉVIA — SEM VALIDADE', () => {
    render(
      <CertificatePreview
        role="ATTENDEE"
        template={mockTemplate}
        signerIds={['sig-1']}
        allSigners={mockSigners}
        eventTitle="Workshop de Cloud Computing"
        speaker="Lucas Silva"
        promoter="Tech Corp"
        startDate="2026-10-26"
        startTime="19:00"
        endDate="2026-10-26"
        endTime="21:00"
        workloadHours="2"
      />
    );

    expect(screen.getByText(/PRÉVIA — SEM VALIDADE/i)).toBeInTheDocument();
  });

  it('deve atualizar reativamente o título e carga horária na prévia', () => {
    const { rerender } = render(
      <CertificatePreview
        role="ATTENDEE"
        template={mockTemplate}
        signerIds={['sig-1']}
        allSigners={mockSigners}
        eventTitle="Introdução a React 19"
        speaker="Lucas Silva"
        startDate="2026-10-26"
        startTime="19:00"
        endDate="2026-10-26"
        endTime="21:00"
        workloadHours="2"
      />
    );

    expect(screen.getByText(/Introdução a React 19/i)).toBeInTheDocument();
    expect(screen.getByText(/2 horas/i)).toBeInTheDocument();

    rerender(
      <CertificatePreview
        role="ATTENDEE"
        template={mockTemplate}
        signerIds={['sig-1']}
        allSigners={mockSigners}
        eventTitle="Arquitetura de Microsserviços"
        speaker="Lucas Silva"
        startDate="2026-10-26"
        startTime="19:00"
        endDate="2026-10-26"
        endTime="22:30"
        workloadHours="3.5"
      />
    );

    expect(screen.getByText(/Arquitetura de Microsserviços/i)).toBeInTheDocument();
    expect(screen.getByText(/3\.5 horas/i)).toBeInTheDocument();
  });

  it('deve exibir ação "participou da palestra" para ATTENDEE e "ministrou a palestra" para SPEAKER', () => {
    const { rerender } = render(
      <CertificatePreview
        role="ATTENDEE"
        template={mockTemplate}
        signerIds={['sig-1']}
        allSigners={mockSigners}
        eventTitle="Workshop de IA"
        speaker="Prof. Carlos"
        startDate="2026-10-26"
        startTime="19:00"
        endDate="2026-10-26"
        endTime="21:00"
        workloadHours="2"
      />
    );

    expect(screen.getByText(/participou da palestra intitulada/i)).toBeInTheDocument();

    rerender(
      <CertificatePreview
        role="SPEAKER"
        template={{ ...mockTemplate, role: 'SPEAKER' }}
        signerIds={['sig-1']}
        allSigners={mockSigners}
        eventTitle="Workshop de IA"
        speaker="Prof. Carlos"
        startDate="2026-10-26"
        startTime="19:00"
        endDate="2026-10-26"
        endTime="21:00"
        workloadHours="2"
      />
    );

    expect(screen.getByText(/ministrou a palestra intitulada/i)).toBeInTheDocument();
    expect(screen.getByText(/Prof\. Carlos/i)).toBeInTheDocument();
  });

  it('deve renderizar assinaturas selecionadas na ordem correta', () => {
    render(
      <CertificatePreview
        role="ATTENDEE"
        template={mockTemplate}
        signerIds={['sig-1', 'sig-2']}
        allSigners={mockSigners}
        eventTitle="Workshop de IA"
        speaker="Prof. Carlos"
        startDate="2026-10-26"
        startTime="19:00"
        endDate="2026-10-26"
        endTime="21:00"
        workloadHours="2"
      />
    );

    expect(screen.getByText(/Prof\. Dr\. Roberto Mendes/i)).toBeInTheDocument();
    expect(screen.getByText(/Diretor da Fatec Itaquera/i)).toBeInTheDocument();
    expect(screen.getByText(/Profa\. Dra\. Ana Clara/i)).toBeInTheDocument();
    expect(screen.getByText(/Coordenadora de Eventos/i)).toBeInTheDocument();
  });

  it('deve disparar onOpenPdfModal quando o botão de conferir PDF for clicado', () => {
    const onOpenPdfModal = vi.fn();
    render(
      <CertificatePreview
        role="ATTENDEE"
        template={mockTemplate}
        signerIds={['sig-1']}
        allSigners={mockSigners}
        eventTitle="Workshop de IA"
        speaker="Prof. Carlos"
        startDate="2026-10-26"
        startTime="19:00"
        endDate="2026-10-26"
        endTime="21:00"
        workloadHours="2"
        onOpenPdfModal={onOpenPdfModal}
      />
    );

    const btn = screen.getByRole('button', { name: /Conferir PDF/i });
    fireEvent.click(btn);
    expect(onOpenPdfModal).toHaveBeenCalledTimes(1);
  });
});
