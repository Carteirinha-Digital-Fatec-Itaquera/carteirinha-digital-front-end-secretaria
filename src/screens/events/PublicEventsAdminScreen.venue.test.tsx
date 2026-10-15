import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PublicEventsAdminScreen from './PublicEventsAdminScreen';
import type { Catalog } from '../../api/event/publicEventService';

const { management } = vi.hoisted(() => ({ management: vi.fn() }));
vi.mock('../../api/event/publicEventService', () => ({ management, uploadAsset: vi.fn(), openManagementPdf: vi.fn() }));
vi.mock('../../components/menuLateral/MenuLateral', () => ({ default: () => null }));
const catalog: Catalog = {
  series: [], templates: [], signers: [],
  events: [{ id: 'other-location', title: 'Atividade em outro local', status: 'SCHEDULED', seriesId: null, geoPolicy: { latitude: -22, longitude: -45, radius: 80, maxAccuracy: 20 } }],
  defaultVenue: { name: 'Fatec Itaquera', address: 'Av. Miguel Ignácio Curi, 360', calibrationRequired: true, policy: { latitude: -23.54503950757055, longitude: -46.46790057119243, radius: 150, maxAccuracy: 50 } },
};
describe('Local padrão para configuração de eventos', () => {
  beforeEach(() => { management.mockResolvedValue(structuredClone(catalog)); });
  async function open() {
    render(<MemoryRouter><PublicEventsAdminScreen /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /^Configurar atividade$/ }));
    await screen.findByText('Av. Miguel Ignácio Curi, 360', { exact: false });
  }
  it('preenche as coordenadas e os limites iniciais fornecidos pelo backend', async () => {
    await open();
    expect(screen.getByLabelText('Latitude')).toHaveValue(-23.54503950757055);
    expect(screen.getByLabelText('Longitude')).toHaveValue(-46.46790057119243);
    expect(screen.getByLabelText('Raio em metros')).toHaveValue(150);
  });
  it('preserva a política salva e só a substitui por ação explícita', async () => {
    await open();
    fireEvent.change(screen.getByRole('combobox', { name: /^Atividade/ }), { target: { value: 'other-location' } });
    await waitFor(() => expect(screen.getByLabelText('Latitude')).toHaveValue(-22));
    expect(screen.getByLabelText('Raio em metros')).toHaveValue(80);
    fireEvent.click(screen.getByRole('button', { name: 'Usar localização padrão da Fatec' }));
    expect(screen.getByLabelText('Latitude')).toHaveValue(-23.54503950757055);
    expect(screen.getByLabelText('Precisão máxima em metros')).toHaveValue(50);
  });
});
