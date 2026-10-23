import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LoginScreen from './LoginScreen';
import { login } from '../../api/auth/login';

vi.mock('../../api/auth/login', () => ({ login: vi.fn() }));
vi.mock('../../api/auth/session', () => ({ acknowledgeSessionNotice: vi.fn(), startSession: vi.fn() }));
vi.mock('../../api/auth/useSecretarySession', () => ({ useSecretarySession: () => ({ notice: false }) }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('Estado visual do login', () => {
  it.each(['success', 'error'])('mantém envio único e encerra o estado de carregamento: %s', async (outcome) => {
    let finish!: (value: Awaited<ReturnType<typeof login>>) => void;
    vi.mocked(login).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    render(<MemoryRouter initialEntries={['/login']}><Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/students" element={<h1>Alunos</h1>} />
    </Routes></MemoryRouter>);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Fazendo login...');
    expect(status.querySelectorAll('[aria-hidden="true"] > span')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'Entrar' })).not.toBeInTheDocument();
    expect(login).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish(outcome === 'success' ? { token: 'token', mustChangePassword: false } : {
        code: 'INVALID', status: '401', message: 'Dados inválidos', timestamp: '', path: '', errorFields: null,
      });
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    if (outcome === 'success') expect(screen.getByRole('heading', { name: 'Alunos' })).toBeInTheDocument();
    else expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });
});
