import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CreditsFormScreen from './CreditsFormScreen';
import * as api from '../../api/projectCredits/projectCreditsAdminService';

vi.mock('../../components/menuLateral/MenuLateral', () => ({ default: () => null }));
vi.mock('../../api/projectCredits/projectCreditsAdminService', () => ({
  getAdminContributor: vi.fn(), createContributorDraft: vi.fn(), updateContributor: vi.fn(),
  uploadContributorPhoto: vi.fn(), removeContributorPhoto: vi.fn(), publishContributor: vi.fn(),
}));
const detail = { id: 'c1', name: 'Colaborador', status: 'DRAFT', draftVersion: 3,
  publishedVersion: null, profileConfirmed: true, photoConfirmed: false, photoUrl: null,
  participations: [], links: [], hasPhoto: false, createdAt: '', updatedAt: '' } as const;
const response = (version: number) => ({ ...detail, draftVersion: version, participations: [], links: [] });
async function openForm() {
  render(<MemoryRouter initialEntries={['/creditos/c1/editar']}><Routes>
    <Route path="/creditos/:id/editar" element={<CreditsFormScreen />} />
  </Routes></MemoryRouter>);
  await screen.findByLabelText('Foto de perfil');
}
function choosePhoto() {
  const file = new File(['photo'], 'foto.png', { type: 'image/png' });
  fireEvent.change(screen.getByLabelText('Foto de perfil'), { target: { files: [file] } });
  return file;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:photo'), revokeObjectURL: vi.fn() }));
  vi.mocked(api.getAdminContributor).mockResolvedValue(response(3));
  vi.mocked(api.updateContributor).mockResolvedValue(response(4));
  vi.mocked(api.uploadContributorPhoto).mockResolvedValue({ ...response(5), photoUrl: 'https://example.com/photo.png', photoConfirmed: true });
});
describe('credits photo form', () => {
  it('previews the selected photo and uploads using the version returned by the save', async () => {
    await openForm();
    const file = choosePhoto();
    await waitFor(() => expect(screen.getAllByAltText('Foto de Colaborador')[0]).toHaveAttribute('src', 'blob:photo'));
    fireEvent.click(screen.getByLabelText(/Confirmo a autorização do colaborador para publicar esta foto/));
    fireEvent.click(screen.getByRole('button', { name: /Salvar Rascunho/ }));
    await waitFor(() => expect(api.uploadContributorPhoto).toHaveBeenCalledWith('c1', 4, file));
    expect(await screen.findByText('Rascunho salvo com sucesso!')).toBeInTheDocument();
    expect(api.publishContributor).not.toHaveBeenCalled();
  });
  it('creates once and retains the new draft after upload failure', async () => {
    vi.mocked(api.createContributorDraft).mockResolvedValue(response(1));
    vi.mocked(api.updateContributor).mockResolvedValueOnce(response(2)).mockResolvedValueOnce(response(3));
    vi.mocked(api.uploadContributorPhoto).mockRejectedValueOnce(new Error('Falha no upload'));
    render(<MemoryRouter initialEntries={['/creditos/novo']}><Routes>
      <Route path="/creditos/novo" element={<CreditsFormScreen />} />
      <Route path="/creditos/:id/editar" element={<div>Editor salvo</div>} />
    </Routes></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Nome Completo *'), { target: { value: 'Novo aluno' } });
    choosePhoto();
    fireEvent.click(screen.getByLabelText(/Confirmo a autorização do colaborador para publicar esta foto/));
    fireEvent.click(screen.getByRole('button', { name: /Salvar Rascunho/ }));
    await screen.findByText('Falha no upload');
    fireEvent.click(screen.getByRole('button', { name: /Salvar Rascunho/ }));
    await screen.findByText('Editor salvo');
    expect(api.createContributorDraft).toHaveBeenCalledTimes(1);
    expect(api.updateContributor).toHaveBeenLastCalledWith('c1', expect.objectContaining({ expectedVersion: 2 }));
    expect(api.uploadContributorPhoto).toHaveBeenLastCalledWith('c1', 3, expect.any(File));
  });
  it('requires authorization before saving a new photo', async () => {
    await openForm(); choosePhoto();
    fireEvent.click(screen.getByRole('button', { name: /Salvar Rascunho/ }));
    expect(await screen.findByText('Confirme a autorização para utilizar a foto.')).toBeInTheDocument();
    expect(api.updateContributor).not.toHaveBeenCalled();
  });
  it('keeps the successful version when an upload fails and can retry', async () => {
    vi.mocked(api.uploadContributorPhoto).mockRejectedValueOnce(new Error('Falha no upload'));
    await openForm(); choosePhoto();
    fireEvent.click(screen.getByLabelText(/Confirmo a autorização do colaborador para publicar esta foto/));
    fireEvent.click(screen.getByRole('button', { name: /Salvar Rascunho/ }));
    await screen.findByText('Falha no upload');
    vi.mocked(api.updateContributor).mockResolvedValue(response(5));
    fireEvent.click(screen.getByRole('button', { name: /Salvar Rascunho/ }));
    await waitFor(() => expect(api.updateContributor).toHaveBeenLastCalledWith('c1', expect.objectContaining({ expectedVersion: 4 })));
    await screen.findByText('Rascunho salvo com sucesso!');
  });
  it('removes a photo only when saving the draft', async () => {
    vi.mocked(api.getAdminContributor).mockResolvedValue({ ...response(3), photoUrl: 'https://example.com/old.png', photoConfirmed: true });
    vi.mocked(api.removeContributorPhoto).mockResolvedValue(response(5));
    await openForm();
    fireEvent.click(screen.getByRole('button', { name: 'Remover foto' }));
    expect(api.removeContributorPhoto).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Salvar Rascunho/ }));
    await waitFor(() => expect(api.removeContributorPhoto).toHaveBeenCalledWith('c1', 4));
    await screen.findByText('Rascunho salvo com sucesso!');
  });
  it('rejects unsupported files without uploading', async () => {
    await openForm();
    fireEvent.change(screen.getByLabelText('Foto de perfil'), { target: { files: [new File(['x'], 'x.svg', { type: 'image/svg+xml' })] } });
    expect(await screen.findByText('Selecione uma imagem JPG, PNG ou WEBP de até 2 MB.')).toBeInTheDocument();
    expect(api.uploadContributorPhoto).not.toHaveBeenCalled();
  });
});
