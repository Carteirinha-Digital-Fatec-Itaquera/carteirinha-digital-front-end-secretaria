import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PhotosScreen from './PhotosScreen';
import { getPendingPhotos } from '../../../api/student/getPendingPhotos';
import { approvePhoto } from '../../../api/student/approvePhoto';

vi.mock('../../../api/student/getPendingPhotos', () => ({ getPendingPhotos: vi.fn() }));
vi.mock('../../../api/student/approvePhoto', () => ({ approvePhoto: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const photo = { ra: '1', name: 'Aluno', email: 'aluno@example.com', photo: '/photo.jpg' };
describe('Badge após decisões sobre fotos', () => {
  beforeEach(() => {
    vi.stubGlobal('innerWidth', 1440);
    vi.mocked(getPendingPhotos).mockReset().mockResolvedValueOnce([photo]).mockResolvedValueOnce([]);
    vi.mocked(approvePhoto).mockReset().mockResolvedValue({ ok: '' });
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
  it.each(['Aprovar', 'Reprovar', 'Aprovar selecionados (1)', 'Reprovar selecionados (1)'])('atualiza após %s', async (action) => {
    render(<MemoryRouter><PhotosScreen /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Fotos pendentes: 1 aguardando análise' });
    if (action.includes('selecionados')) fireEvent.click(screen.getByRole('button', { name: 'Selecionar todos' }));
    fireEvent.click(screen.getByRole('button', { name: action }));
    await screen.findByText('Nenhuma solicitação pendente.');
    expect(screen.getByRole('button', { name: 'Fotos pendentes' })).not.toHaveTextContent('1');
    expect(approvePhoto).toHaveBeenCalledTimes(1);
    expect(getPendingPhotos).toHaveBeenCalledTimes(2);
  });
  it('mantém a contagem quando a decisão é recusada pela API', async () => {
    vi.mocked(approvePhoto).mockResolvedValue({ code: 'ERROR', status: '500', message: 'Falha', timestamp: '', path: '', errorFields: null });
    render(<MemoryRouter><PhotosScreen /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Fotos pendentes: 1 aguardando análise' });
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }));
    await waitFor(() => expect(approvePhoto).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Fotos pendentes: 1 aguardando análise' })).toBeInTheDocument();
    expect(getPendingPhotos).toHaveBeenCalledTimes(1);
  });
});
