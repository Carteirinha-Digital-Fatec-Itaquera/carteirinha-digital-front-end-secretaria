import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MenuLateral from './MenuLateral';

describe('Menu responsivo da Secretaria', () => {
  beforeEach(() => {
    vi.stubGlobal('innerWidth', 390);
    // JSDOM does not implement the native dialog API; browser checks cover focus trapping.
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } });
  });
  afterEach(() => { cleanup(); Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal'); Reflect.deleteProperty(HTMLDialogElement.prototype, 'close'); vi.unstubAllGlobals(); sessionStorage.clear(); });
  const setup = () => render(<MemoryRouter initialEntries={['/students']}><MenuLateral /><Routes><Route path="/students" element={<h1>Alunos</h1>} /><Route path="/register" element={<h1>Cadastro</h1>} /><Route path="/login" element={<h1>Login</h1>} /></Routes></MemoryRouter>);
  it('fecha o painel ao navegar sem remover a sessão', () => {
    sessionStorage.setItem('token', 'existing-session');
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar aluno' }));
    expect(screen.getByRole('heading', { name: 'Cadastro' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('token')).toBe('existing-session');
  });
  it('fecha por Escape e mantém o botão de abertura disponível', () => {
    setup();
    const trigger = screen.getByRole('button', { name: 'Abrir menu' });
    fireEvent.click(trigger);
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });
  it('confirma o logout antes de encerrar a sessão', () => {
    sessionStorage.setItem('token', 'existing-session');
    setup();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Deslogar' }));

    expect(screen.getByRole('dialog', { name: 'Sair da conta?' })).toBeInTheDocument();
    expect(sessionStorage.getItem('token')).toBe('existing-session');

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(sessionStorage.getItem('token')).toBe('existing-session');
    expect(screen.queryByRole('dialog', { name: 'Sair da conta?' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Deslogar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(sessionStorage.getItem('token')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
  });
});
