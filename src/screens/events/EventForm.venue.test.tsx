import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { EventForm } from './components/EventForm';
import type { Catalog } from '../../api/event/publicEventService';
import type { EventView } from '../../domains/Event';

const { management } = vi.hoisted(() => ({ management: vi.fn() }));
vi.mock('../../api/event/publicEventService', () => ({
  management,
  uploadAsset: vi.fn(),
  openManagementPdf: vi.fn(),
}));

const catalog: Catalog = {
  series: [],
  templates: [],
  signers: [],
  events: [
    {
      id: 'other-location',
      title: 'Atividade em outro local',
      status: 'SCHEDULED',
      seriesId: null,
      geoPolicy: {
        latitude: -22,
        longitude: -45,
        radius: 80,
        maxAccuracy: 20,
      },
    },
  ],
  defaultVenue: {
    name: 'Fatec Itaquera',
    address: 'Av. Miguel Ignácio Curi, 360',
    calibrationRequired: true,
    policy: {
      latitude: -23.54503950757055,
      longitude: -46.46790057119243,
      radius: 150,
      maxAccuracy: 50,
    },
  },
};

describe('Local padrão para configuração de eventos no formulário unificado', () => {
  beforeEach(() => {
    management.mockResolvedValue(structuredClone(catalog));
  });

  it('preenche as coordenadas e os limites padrão da Fatec ao clicar no botão de preset', async () => {
    render(<EventForm submitLabel="Registrar" onSubmit={vi.fn()} />);
    await screen.findByText('Av. Miguel Ignácio Curi, 360', { exact: false });

    fireEvent.click(
      screen.getByRole('button', { name: 'Usar localização padrão da Fatec' })
    );

    expect(screen.getByLabelText('Latitude')).toHaveValue(-23.54503950757055);
    expect(screen.getByLabelText('Longitude')).toHaveValue(-46.46790057119243);
    expect(screen.getByLabelText('Raio em metros')).toHaveValue(150);
    expect(screen.getByLabelText('Precisão máxima em metros')).toHaveValue(50);
  });

  it('preserva a política salva de um evento existente até ação explícita', async () => {
    const savedEvent: EventView = {
      id: 'other-location',
      title: 'Atividade em outro local',
      description: null,
      speaker: 'Palestrante',
      location: 'Auditório',
      startsAt: '2026-10-15T19:00:00.000Z',
      endsAt: '2026-10-15T21:00:00.000Z',
      workloadMinutes: 120,
      status: 'SCHEDULED',
      certificateEnabled: true,
      checkpoints: [],
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: '2026-10-15T10:00:00.000Z',
      cancelReason: null,
      cancelledAt: null,
      cancelledById: null,
      geoPolicy: {
        latitude: -22,
        longitude: -45,
        radius: 80,
        maxAccuracy: 20,
      },
    };

    render(
      <EventForm
        initialValue={savedEvent}
        submitLabel="Salvar"
        onSubmit={vi.fn()}
      />
    );
    await screen.findByText('Av. Miguel Ignácio Curi, 360', { exact: false });

    // Preserva a política salva
    expect(screen.getByLabelText('Latitude')).toHaveValue(-22);
    expect(screen.getByLabelText('Longitude')).toHaveValue(-45);
    expect(screen.getByLabelText('Raio em metros')).toHaveValue(80);
    expect(screen.getByLabelText('Precisão máxima em metros')).toHaveValue(20);

    // Substitui somente por ação explícita
    fireEvent.click(
      screen.getByRole('button', { name: 'Usar localização padrão da Fatec' })
    );

    expect(screen.getByLabelText('Latitude')).toHaveValue(-23.54503950757055);
    expect(screen.getByLabelText('Longitude')).toHaveValue(-46.46790057119243);
    expect(screen.getByLabelText('Raio em metros')).toHaveValue(150);
    expect(screen.getByLabelText('Precisão máxima em metros')).toHaveValue(50);

    // Garante que campos de coordenada são somente leitura (não digitáveis manualmente)
    expect(screen.getByLabelText('Latitude')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Longitude')).toHaveAttribute('readonly');

    // Garante que o preset também preenche os dados de endereço
    expect(screen.getByLabelText('CEP')).toHaveValue('08295-005');
    expect(screen.getByLabelText('Logradouro / Rua')).toHaveValue('Av. Miguel Ignácio Curi');
    expect(screen.getByLabelText('Número')).toHaveValue('360');
    expect(screen.getByLabelText('Bairro')).toHaveValue('Vila Carmosina');
  });

  it('campos de latitude e longitude sao sempre somente leitura para evitar digitacao manual', async () => {
    render(<EventForm submitLabel="Registrar" onSubmit={vi.fn()} />);
    await screen.findByText('Av. Miguel Ignácio Curi, 360', { exact: false });

    expect(screen.getByLabelText('Latitude')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Longitude')).toHaveAttribute('readonly');
  });
});
