import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import RequireSecretarySession from './components/auth/RequireSecretarySession';
import EventsRouteScaffold from './screens/events/EventsRouteScaffold';
import CertificateRouteScaffold from './screens/certificate/CertificateRouteScaffold';

function TestApp({ initialRoute = '/' }: { initialRoute?: string }) {
  return (
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/login" element={<div data-testid="login-screen">Login Screen</div>} />
        <Route path="/criar-evento" element={<Navigate to="/eventos/novo" replace />} />

        <Route element={<RequireSecretarySession />}>
          <Route path="/eventos" element={<EventsRouteScaffold />} />
          <Route path="/eventos/novo" element={<EventsRouteScaffold />} />
          <Route path="/eventos/:id/gerenciar" element={<EventsRouteScaffold />} />
        </Route>

        <Route path="/certificado/verificar/:codigo" element={<CertificateRouteScaffold />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('App Route Navigation and Security', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe('Administrative events routes without session token', () => {
    it('redirects /eventos to /login when unauthenticated', () => {
      render(<TestApp initialRoute="/eventos" />);
      expect(screen.getByTestId('login-screen')).toBeInTheDocument();
      expect(screen.queryByTestId('events-scaffold-title')).not.toBeInTheDocument();
    });

    it('redirects /eventos/novo to /login when unauthenticated', () => {
      render(<TestApp initialRoute="/eventos/novo" />);
      expect(screen.getByTestId('login-screen')).toBeInTheDocument();
    });

    it('redirects alias /criar-evento to /login when unauthenticated (via /eventos/novo redirect)', () => {
      render(<TestApp initialRoute="/criar-evento" />);
      expect(screen.getByTestId('login-screen')).toBeInTheDocument();
    });

    it('redirects /eventos/:id/gerenciar to /login when unauthenticated', () => {
      render(<TestApp initialRoute="/eventos/evt-123/gerenciar" />);
      expect(screen.getByTestId('login-screen')).toBeInTheDocument();
    });
  });

  describe('Administrative events routes with authenticated session', () => {
    beforeEach(() => {
      sessionStorage.setItem('token', 'valid-sec-jwt');
    });

    it('renders /eventos with MenuLateral and active events item', () => {
      render(<TestApp initialRoute="/eventos" />);
      expect(screen.getByTestId('events-scaffold-title')).toHaveTextContent('Eventos');
      const menuEventItem = screen.getByRole('button', { name: /eventos/i });
      expect(menuEventItem).toBeInTheDocument();
    });

    it('renders /eventos/novo when navigating to /criar-evento alias', () => {
      render(<TestApp initialRoute="/criar-evento" />);
      expect(screen.getByTestId('events-scaffold-title')).toHaveTextContent('Cadastrar Novo Evento');
      expect(screen.getByTestId('events-scaffold-path')).toHaveTextContent('/eventos/novo');
    });

    it('renders /eventos/:id/gerenciar with event id in title', () => {
      render(<TestApp initialRoute="/eventos/test-id-999/gerenciar" />);
      expect(screen.getByTestId('events-scaffold-title')).toHaveTextContent('Gerenciar Evento test-id-999');
    });

    it('allows keyboard navigation on menu item via Enter key', () => {
      render(<TestApp initialRoute="/eventos/novo" />);
      const menuEventItem = screen.getByRole('button', { name: /eventos/i });
      fireEvent.keyDown(menuEventItem, { key: 'Enter', code: 'Enter' });
      // Rota mudou para /eventos
      expect(screen.getByTestId('events-scaffold-title')).toHaveTextContent('Eventos');
    });
  });

  describe('Public certificate verification route', () => {
    it('is accessible without token and does not render MenuLateral', () => {
      render(<TestApp initialRoute="/certificado/verificar/CERT-VALID-123" />);
      expect(screen.getByTestId('certificate-scaffold-title')).toHaveTextContent('Verificação de Certificado');
      expect(screen.getByTestId('certificate-scaffold-code')).toHaveTextContent('CERT-VALID-123');
      expect(screen.queryByRole('button', { name: /eventos/i })).not.toBeInTheDocument();
      expect(screen.queryByTestId('login-screen')).not.toBeInTheDocument();
    });
  });
});
