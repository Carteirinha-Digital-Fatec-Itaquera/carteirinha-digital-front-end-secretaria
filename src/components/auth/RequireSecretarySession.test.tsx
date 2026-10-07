import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import App from '../../App';
import LoginScreen from '../../screens/login/LoginScreen';
import RequireSecretarySession from './RequireSecretarySession';
import { checkSession, expireSession, getSessionSnapshot, logoutSession, startSession } from '../../api/auth/session';

const token = 'e30.eyJleHAiOjQxMDI0NDQ4MDB9.c2ln';
beforeEach(() => { logoutSession(); sessionStorage.clear(); vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => { cleanup(); logoutSession(); vi.unstubAllGlobals(); });

describe('private routes and recovery', () => {
  it.each(['/students', '/register', '/update/123', '/upload-alunos', '/perfil', '/fotos', '/redefinir-senha', '/eventos', '/eventos/novo', '/eventos/123/editar', '/eventos/123/gerenciar', '/criar-evento'])('protects direct access to %s without alert for a visitor', path => {
    window.history.replaceState({}, '', path);
    render(<App />);
    expect(window.location.pathname).toBe('/login');
    expect(screen.getByText('Login secretaria')).toBeInTheDocument();
    expect(screen.queryByText('Sua sessão expirou. Entre novamente.')).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['/access', '/redefine', '/code/fixture@example.test', '/password/fixture@example.test/123456', '/reset-password?token=fixture&id=1&type=secretaria'])('keeps public onboarding/recovery accessible: %s', path => {
    window.history.replaceState({}, '', path);
    render(<App />);
    expect(window.location.pathname).toBe(path.split('?')[0]);
    expect(screen.queryByText('Login secretaria')).not.toBeInTheDocument();
  });
  it.each(['invalid', 'e30.eyJleHAiOjF9.c2ln'])('rejects stored token %s and displays exactly one accessible notice', stored => {
    sessionStorage.setItem('token', stored);
    window.history.replaceState({}, '', '/students');
    render(<App />);
    expect(window.location.pathname).toBe('/login');
    const notice = screen.getByText('Sua sessão expirou. Entre novamente.');
    expect(notice).toHaveAttribute('role', 'alert');
    expect(notice).toHaveClass('sessionNotice');
    expect(screen.getAllByText(notice.textContent!)).toHaveLength(1);
    cleanup();
    // Reload/back to a private URL cannot recover data or repeat the consumed notice.
    window.history.replaceState({}, '', '/students');
    render(<App />);
    expect(window.location.pathname).toBe('/login');
    expect(screen.queryByText('Sua sessão expirou. Entre novamente.')).not.toBeInTheDocument();
  });
  it('removes private state, replaces history, and allows a fresh session', () => {
    function PrivateScreen() {
      const [value, setValue] = useState('');
      return <input aria-label="Private draft" value={value} onChange={event => setValue(event.target.value)} />;
    }
    function Controls() {
      const navigate = useNavigate();
      return <><button onClick={() => navigate(-1)}>Back</button><button onClick={() => { startSession(token); navigate('/private'); }}>New login</button></>;
    }
    startSession(token);
    render(<MemoryRouter initialEntries={['/public', '/private']}><Controls /><Routes>
      <Route path="/public" element={<p>Public screen</p>} />
      <Route path="/login" element={<LoginScreen />} />
      <Route element={<RequireSecretarySession />}><Route path="/private" element={<PrivateScreen />} /></Route>
    </Routes></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Private draft'), { target: { value: 'sensitive draft' } });
    act(() => expireSession(getSessionSnapshot(), 'unauthorized'));
    expect(screen.queryByLabelText('Private draft')).not.toBeInTheDocument();
    expect(screen.getByText('Sua sessão expirou. Entre novamente.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText('Public screen')).toBeInTheDocument();
    fireEvent.click(screen.getByText('New login'));
    expect(screen.getByLabelText('Private draft')).toHaveValue('');
    act(() => { sessionStorage.removeItem('token'); checkSession(); });
    expect(screen.queryByLabelText('Private draft')).not.toBeInTheDocument();
  });
});
