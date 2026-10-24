import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CertificateCatalogManager } from './CertificateCatalogManager';
import { management } from '../../../api/event/publicEventService';
vi.mock('../../../api/event/publicEventService', () => ({ management: vi.fn(), uploadAsset: vi.fn() }));
const item = { id: 'template-1', name: 'Semana final', role: 'ATTENDEE', version: 4, status: 'PUBLISHED', config: { heading: 'CERTIFICADO', edition: 'Semana 2026', design: 'TECHNOLOGY_BLUE_2026_DARK' } };
const original = { templates: [item], signers: [] };
beforeEach(() => { vi.clearAllMocks(); vi.mocked(management).mockResolvedValue(original); });
describe('Gestão de certificados e assinaturas', () => {
  it('carrega cadastros reais pelo serviço', async () => {
    render(<CertificateCatalogManager />);
    expect(await screen.findByText('Semana final')).toBeInTheDocument();
    expect(management).toHaveBeenCalledWith('catalog/manage', undefined, 'GET', expect.any(AbortSignal));
  });
  it('edita com versão esperada e preserva design', async () => {
    render(<CertificateCatalogManager />);
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Semana final' }));
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Nome corrigido' } });
    fireEvent.change(screen.getByLabelText('Cor do texto do certificado'), { target: { value: '#ffeecc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar cadastro' }));
    await waitFor(() => expect(management).toHaveBeenCalledWith('templates/template-1', expect.objectContaining({ name: 'Nome corrigido', textColor: '#ffeecc', expectedVersion: 4, design: 'TECHNOLOGY_BLUE_2026_DARK' }), 'PATCH'));
    expect(await screen.findByRole('status')).toHaveTextContent('Cadastro salvo');
  });
  it('só exclui depois da confirmação e usa versão esperada', async () => {
    render(<CertificateCatalogManager />);
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir Semana final' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('históricos');
    expect(management).not.toHaveBeenCalledWith('templates/template-1', expect.anything(), 'DELETE');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }));
    await waitFor(() => expect(management).toHaveBeenCalledWith('templates/template-1', { expectedVersion: 4 }, 'DELETE'));
  });
  it('mantém o formulário preenchido após conflito', async () => {
    vi.mocked(management).mockImplementation(async (path) => { if (path === 'templates/template-1') throw new Error('Atualize a lista antes de editar.'); return original as never; });
    render(<CertificateCatalogManager />);
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Semana final' }));
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Nome preservado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar cadastro' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Atualize a lista');
    expect(screen.getByLabelText('Nome')).toHaveValue('Nome preservado');
  });
});
