import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getPendingPhotos } from '../../api/student/getPendingPhotos';
import MenuLateral from './MenuLateral';

vi.mock('../../api/student/getPendingPhotos', () => ({ getPendingPhotos: vi.fn() }));
const getPhotos = vi.mocked(getPendingPhotos);
const photo = { ra: '1', name: 'Aluno', email: 'aluno@example.com', photo: '/photo.jpg' };
const menu = (count?: number | null) => <MemoryRouter><MenuLateral pendingPhotoCount={count} /></MemoryRouter>;

describe('Contagem de fotos no menu', () => {
  beforeEach(() => { vi.stubGlobal('innerWidth', 1440); getPhotos.mockReset(); });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('consulta a lista e atualiza ao retornar à janela, ocultando zero', async () => {
    getPhotos.mockResolvedValueOnce([photo, { ...photo, ra: '2' }]).mockResolvedValueOnce([]);
    render(menu());
    expect(await screen.findByRole('button', { name: 'Fotos pendentes: 2 aguardando análise' })).toHaveTextContent('2');
    fireEvent(window, new Event('focus'));
    await waitFor(() => expect(getPhotos).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: 'Fotos pendentes' })).not.toHaveTextContent('2');
  });

  it('oculta uma contagem antiga quando a consulta falha', async () => {
    getPhotos.mockResolvedValueOnce([photo]).mockRejectedValueOnce(new Error('offline'));
    render(menu());
    await screen.findByRole('button', { name: 'Fotos pendentes: 1 aguardando análise' });
    await act(async () => { fireEvent(window, new Event('focus')); });
    expect(screen.getByRole('button', { name: 'Fotos pendentes' })).not.toHaveTextContent('1');
  });

  it.each([1440, 900, 390])('usa a recarga da tela sem consulta duplicada na largura %i', (width) => {
    vi.stubGlobal('innerWidth', width);
    const view = render(menu(3));
    if (width < 768) fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    expect(screen.getByRole('button', { name: 'Fotos pendentes: 3 aguardando análise' })).toHaveTextContent('3');
    expect(screen.getByRole('button', { name: 'Sobre' })).toBeInTheDocument();
    view.rerender(menu(null));
    expect(screen.getByRole('button', { name: 'Fotos pendentes' })).not.toHaveTextContent('3');
    view.rerender(menu(1));
    expect(screen.getByRole('button', { name: 'Fotos pendentes: 1 aguardando análise' })).toHaveTextContent('1');
    view.rerender(menu(0));
    expect(screen.getByRole('button', { name: 'Fotos pendentes' })).not.toHaveTextContent('0');
    expect(getPhotos).not.toHaveBeenCalled();
  });

  it('descarta resposta antiga quando uma atualização mais recente termina antes', async () => {
    let resolveOld!: (value: unknown) => void;
    getPhotos.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; })).mockResolvedValueOnce([]);
    render(menu());
    await act(async () => { fireEvent(window, new Event('focus')); });
    await act(async () => { resolveOld([photo]); });
    expect(screen.getByRole('button', { name: 'Fotos pendentes' })).not.toHaveTextContent('1');
  });
});
