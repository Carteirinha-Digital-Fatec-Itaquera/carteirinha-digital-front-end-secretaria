import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import PendingPhotoPreview from './PendingPhotoPreview';

afterEach(cleanup);
describe('Visualização de fotos pendentes', () => {
  it('isola cliques, abre o modal, fecha pelo X e devolve foco', () => {
    const select = vi.fn();
    render(<div onClick={select}><PendingPhotoPreview src="/foto.jpg" name="Ana" /></div>);
    const trigger = screen.getByRole('button', { name: 'Ampliar foto de Ana' });
    trigger.focus();
    fireEvent.click(trigger.querySelector('svg')!);
    expect(screen.getByRole('dialog', { name: 'Foto de Ana' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Foto completa de Ana' })).toHaveAttribute('src', '/foto.jpg');
    fireEvent.click(screen.getByRole('button', { name: 'Fechar visualização da foto' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(select).not.toHaveBeenCalled();
  });
  it('responde ao cancelamento nativo usado por Escape', () => {
    render(<PendingPhotoPreview src="/foto.jpg" name="Ana" />);
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar foto de Ana' }));
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: false, cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('trata carregamento e erro sem imagem quebrada e tenta novamente ao reabrir', () => {
    render(<PendingPhotoPreview src="/foto.jpg" name="Ana" />);
    const trigger = screen.getByRole('button', { name: 'Ampliar foto de Ana' });
    fireEvent.click(trigger);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando foto');
    fireEvent.error(screen.getByRole('img', { name: 'Foto completa de Ana' }));
    expect(screen.getByRole('status')).toHaveTextContent('Foto indisponível');
    expect(screen.queryByRole('img', { name: 'Foto completa de Ana' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar visualização da foto' }));
    fireEvent.click(trigger);
    fireEvent.load(screen.getByRole('img', { name: 'Foto completa de Ana' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
  it('trata endereço ausente', () => {
    render(<PendingPhotoPreview src="" name="Ana" />);
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar foto de Ana' }));
    expect(screen.getByRole('status')).toHaveTextContent('Foto indisponível');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
