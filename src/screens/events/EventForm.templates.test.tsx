import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EventForm } from './components/EventForm';
import * as publicEventService from '../../api/event/publicEventService';

vi.mock('../../api/event/publicEventService', () => {
  return {
    management: vi.fn(),
    openManagementPdf: vi.fn(),
    uploadAsset: vi.fn(),
    getManagementPdfBlobUrl: vi.fn(),
    fetchAssetBlobUrl: vi.fn(),
    revokeAssetBlobUrl: vi.fn(),
  };
});

describe('EventForm - Seleção e Upload de Modelos de Certificado', () => {
  const mockCatalog: publicEventService.Catalog = {
    series: [],
    events: [],
    defaultVenue: {
      name: 'Fatec Itaquera',
      address: 'Av. Miguel Ignácio Curi, 360',
      calibrationRequired: false,
      policy: {
        latitude: -23.545,
        longitude: -46.467,
        radius: 150,
        maxAccuracy: 50,
      },
    },
    templates: [
      {
        id: 'tmpl-week-att',
        name: 'XIII Semana de Tecnologia — Participante',
        role: 'ATTENDEE',
        version: 1,
        status: 'PUBLISHED',
        config: {
          heading: 'CERTIFICADO',
          edition: "XIII Semana de Tecnologia da Fatec Itaquera 'Professor Miguel Reale'",
        },
      },
      {
        id: 'tmpl-week-spk',
        name: 'XIII Semana de Tecnologia — Palestrante',
        role: 'SPEAKER',
        version: 1,
        status: 'PUBLISHED',
        config: {
          heading: 'CERTIFICADO',
          edition: "XIII Semana de Tecnologia da Fatec Itaquera 'Professor Miguel Reale'",
        },
      },
    ],
    signers: [
      {
        id: 'signer-1',
        name: 'Prof. Carlos Henrique',
        title: 'Coordenador DSM',
        course: 'DSM',
        archived: false,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(publicEventService.management).mockImplementation(async (path) => {
      if (path === 'catalog') {
        return mockCatalog as unknown as Awaited<ReturnType<typeof publicEventService.management>>;
      }
      return {} as unknown as Awaited<ReturnType<typeof publicEventService.management>>;
    });
  });

  it('exibe o modelo institucional padrão e os modelos prontos da Semana de Tecnologia no seletor', async () => {
    render(<EventForm submitLabel="Salvar" onSubmit={vi.fn()} />);

    await waitFor(() => {
      const attendeeSelect = screen.getByLabelText('Modelo de participante') as HTMLSelectElement;
      expect(attendeeSelect).toBeInTheDocument();
      expect(attendeeSelect.options.length).toBeGreaterThanOrEqual(2);
      expect(attendeeSelect.options[0].text).toContain('Modelo Institucional Padrão Fatec');
      expect(attendeeSelect.options[1].text).toContain('XIII Semana de Tecnologia — Participante (Modelo Oficial Pronto)');
    });

    const speakerSelect = screen.getByLabelText('Modelo de palestrante (opcional)') as HTMLSelectElement;
    expect(speakerSelect.options[0].text).toContain('Padrão institucional');
    expect(speakerSelect.options[1].text).toContain('XIII Semana de Tecnologia — Palestrante (Modelo Oficial Pronto)');
  });

  it('permite abrir modal, preencher dados e subir um novo formato de certificado personalizado', async () => {
    const createdTemplate: publicEventService.Template = {
      id: 'tmpl-custom-1',
      name: 'Palestra Cloud e IA',
      role: 'ATTENDEE',
      version: 1,
      status: 'PUBLISHED',
      config: {
        heading: 'CERTIFICADO',
        edition: 'Jornada Cloud 2026',
        backgroundAssetId: 'asset-bg-123',
      },
    };

    vi.mocked(publicEventService.uploadAsset).mockResolvedValueOnce({ id: 'asset-bg-123' });
    vi.mocked(publicEventService.management).mockImplementation(async (path) => {
      if (path === 'catalog') {
        return {
          ...mockCatalog,
          templates: [...mockCatalog.templates, createdTemplate],
        } as unknown as Awaited<ReturnType<typeof publicEventService.management>>;
      }
      if (path === 'templates') {
        return createdTemplate as unknown as Awaited<ReturnType<typeof publicEventService.management>>;
      }
      return {} as unknown as Awaited<ReturnType<typeof publicEventService.management>>;
    });

    render(<EventForm submitLabel="Salvar" onSubmit={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('+ Subir novo formato de certificado')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ Subir novo formato de certificado'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Subir Novo Formato de Certificado/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Nome do modelo'), {
      target: { value: 'Palestra Cloud e IA' },
    });
    fireEvent.change(screen.getByLabelText('Edição / Identificação do Evento'), {
      target: { value: 'Jornada Cloud 2026' },
    });

    const dummyFile = new File(['dummy-image'], 'background.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(/Arte de Fundo/);
    fireEvent.change(fileInput, { target: { files: [dummyFile] } });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar e Usar Formato' }));

    await waitFor(() => {
      expect(publicEventService.uploadAsset).toHaveBeenCalledWith(dummyFile, 'BACKGROUND');
      expect(publicEventService.management).toHaveBeenCalledWith(
        'templates',
        expect.objectContaining({
          name: 'Palestra Cloud e IA',
          role: 'ATTENDEE',
          heading: 'CERTIFICADO',
          edition: 'Jornada Cloud 2026',
          backgroundAssetId: 'asset-bg-123',
          autoPublish: true,
        }),
        'POST'
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      const attendeeSelect = screen.getByLabelText('Modelo de participante') as HTMLSelectElement;
      expect(attendeeSelect.value).toBe('tmpl-custom-1');
    });
  });

  it('permite abrir modal de novo assinante autorizado e cadastrá-lo com assinatura gráfica', async () => {
    const createdSigner: publicEventService.Signer = {
      id: 'signer-2',
      name: 'Dra. Maria Souza',
      title: 'Diretora da Fatec Itaquera',
      course: 'Diretoria',
      archived: false,
    };

    vi.mocked(publicEventService.uploadAsset).mockResolvedValueOnce({ id: 'asset-sig-456' });
    vi.mocked(publicEventService.management).mockImplementation(async (path) => {
      if (path === 'catalog') {
        return {
          ...mockCatalog,
          signers: [...mockCatalog.signers, createdSigner],
        } as unknown as Awaited<ReturnType<typeof publicEventService.management>>;
      }
      if (path === 'signers') {
        return createdSigner as unknown as Awaited<ReturnType<typeof publicEventService.management>>;
      }
      return {} as unknown as Awaited<ReturnType<typeof publicEventService.management>>;
    });

    render(<EventForm submitLabel="Salvar" onSubmit={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Modelo de participante')).toBeInTheDocument();
    });

    const attendeeSelect = screen.getByLabelText('Modelo de participante') as HTMLSelectElement;
    fireEvent.change(attendeeSelect, { target: { value: 'tmpl-week-att' } });

    await waitFor(() => {
      expect(screen.getAllByText('+ Cadastrar novo assinante')[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('+ Cadastrar novo assinante')[0]);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Cadastrar Novo Assinante Autorizado')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Nome completo'), {
      target: { value: 'Dra. Maria Souza' },
    });
    fireEvent.change(screen.getByLabelText('Cargo / Função'), {
      target: { value: 'Diretora da Fatec Itaquera' },
    });

    const sigFile = new File(['signature-data'], 'signature.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(/Imagem da Assinatura/);
    fireEvent.change(fileInput, { target: { files: [sigFile] } });

    fireEvent.click(screen.getByLabelText(/Confirmo que esta assinatura possui autorização/));

    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar Assinante' }));

    await waitFor(() => {
      expect(publicEventService.uploadAsset).toHaveBeenCalledWith(sigFile, 'SIGNATURE');
      expect(publicEventService.management).toHaveBeenCalledWith(
        'signers',
        expect.objectContaining({
          name: 'Dra. Maria Souza',
          title: 'Diretora da Fatec Itaquera',
          assetId: 'asset-sig-456',
          authorized: true,
        }),
        'POST'
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
