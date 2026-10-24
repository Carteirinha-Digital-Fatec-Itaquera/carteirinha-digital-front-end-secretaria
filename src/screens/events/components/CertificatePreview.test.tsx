import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CertificatePreview } from './CertificatePreview';
import {
  fetchAssetBlobUrl,
  releaseAssetBlobUrl,
  revokeAllAssetBlobUrls,
} from '../../../api/event/publicEventService';
import { startSession, logoutSession } from '../../../api/auth/session';
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

  it('deve exibir alerta role="alert" quando título contínuo sem espaços exceder a altura suportada (C3)', () => {
    const continuousTitle = 'W'.repeat(199);
    render(
      <CertificatePreview
        role="ATTENDEE"
        template={null}
        signerIds={['sig-1']}
        allSigners={mockSigners}
        eventTitle={continuousTitle}
        startDate="2026-10-26"
        startTime="19:00"
        endDate="2026-10-26"
        endTime="21:00"
        workloadHours="2"
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/Texto longo excede o limite suportado/i);

    // No modelo institucional padrão, deve encontrar o texto do título contínuo reconstruído
    const textElements = document.querySelectorAll('svg text');
    const titleElement = Array.from(textElements).find(
      (el) => el.textContent?.trim() === continuousTitle
    );
    expect(titleElement).toBeDefined();
  });

  it('deve gerenciar contagem de referências de Blobs compartilhados sem revogação prematura (C4)', async () => {
    const validToken = `${btoa(JSON.stringify({ alg: 'HS256' }))}.${btoa(
      JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, role: 'secretary', sub: 1 })
    )}.sig`;
    startSession(validToken);

    revokeAllAssetBlobUrls();
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    const revokeSpy = vi.fn();
    let urlCounter = 0;
    URL.createObjectURL = vi.fn(() => `blob:test-asset-${++urlCounter}`);
    URL.revokeObjectURL = revokeSpy;

    // Simula resposta de rede para o fetch
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['dummy content'], { type: 'image/png' }),
    } as unknown as Response);

    try {
      // Primeira aquisição (ex: instância 1)
      const url1 = await fetchAssetBlobUrl('asset-shared-123');
      expect(url1).toBe('blob:test-asset-1');

      // Segunda aquisição pelo mesmo assetId (ex: instância 2 compartilhando a mesma assinatura)
      const url2 = await fetchAssetBlobUrl('asset-shared-123');
      expect(url2).toBe('blob:test-asset-1');
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);

      // Instância 1 desmonta ou remove assinatura (release 1)
      releaseAssetBlobUrl('asset-shared-123');
      // Não deve ter revogado pois a instância 2 ainda usa
      expect(revokeSpy).not.toHaveBeenCalled();

      // Instância 2 desmonta (release 2)
      releaseAssetBlobUrl('asset-shared-123');
      // Agora refCount chegou a zero, deve ter revogado
      expect(revokeSpy).toHaveBeenCalledTimes(1);
      expect(revokeSpy).toHaveBeenCalledWith('blob:test-asset-1');

      // Nova seleção após revogação: deve gerar uma NOVA URL
      const url3 = await fetchAssetBlobUrl('asset-shared-123');
      expect(url3).toBe('blob:test-asset-2');
      expect(URL.createObjectURL).toHaveBeenCalledTimes(2);

      releaseAssetBlobUrl('asset-shared-123');
      expect(revokeSpy).toHaveBeenCalledTimes(2);
      expect(revokeSpy).toHaveBeenCalledWith('blob:test-asset-2');
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
      revokeAllAssetBlobUrls();
      logoutSession();
    }
  });
});

it.each(['TECHNOLOGY_BLUE_2026', 'TECHNOLOGY_BLUE_2026_DARK'] as const)('usa arte original sem moldura legada: %s', async (design) => {
  const { act } = await import('@testing-library/react');
  let container: HTMLElement;
  await act(async () => {
    ({ container } = render(<CertificatePreview template={{ id: 'blue', name: 'Azul Circuitos', role: 'ATTENDEE', status: 'PUBLISHED', version: 1, config: { heading: 'CERTIFICADO', edition: 'XIII Semana de Tecnologia', design, attendeeAction: 'participou da atividade' } }} signerIds={[]} allSigners={[]} eventTitle="Curso CLP Básico" />));
  });
  expect(container!.querySelector(design === 'TECHNOLOGY_BLUE_2026_DARK' ? 'image[href="/technology-2026-campaign-heading.png"]' : 'image[href="/technology-2026-campaign-banner.png"]')).not.toBeNull();
  expect(container!.querySelector('image[href="/technology-2026-campaign-cover.png"]')).not.toBeNull();
  expect(container!.querySelector('#reference-background')).toBeNull();
  expect(container!.textContent).toContain('participou da atividade');
  if (design === 'TECHNOLOGY_BLUE_2026_DARK') {
    const tint = container!.querySelector('[data-testid="campaign-uniform-tint"]');
    expect(tint).toHaveAttribute('x', '0');
    expect(tint).toHaveAttribute('y', '0');
    expect(tint).toHaveAttribute('width', '842');
    expect(tint).toHaveAttribute('height', '595');
    expect(container!.querySelector('image[href="/cps_logo_branco_oficial.png"]')).not.toBeNull();
    expect(container!.querySelector('rect[fill="#D9EAF8"][x="66"]')).toBeNull();
  }

});
