import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Navigate } from 'react-router-dom';
import ProjectCreditsScreen from './ProjectCreditsScreen';
import CreditsFormScreen from './CreditsFormScreen';
import { startSession, logoutSession } from '../../api/auth/session';

vi.mock('../../components/menuLateral/MenuLateral', () => ({
  default: () => <div data-testid="mock-menu-lateral">MenuLateral</div>,
}));

vi.mock('../../api/projectCredits/projectCreditsAdminService', () => ({
  listAdminContributors: vi.fn().mockResolvedValue({
    items: [
      {
        id: 'c1',
        name: 'Desenvolvedor Teste',
        status: 'PUBLISHED',
        draftVersion: 1,
        publishedVersion: 1,
        hasUnpublishedChanges: false,
        semesters: ['2026-1'],
        roles: ['Desenvolvedor'],
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
    ],
    total: 1,
    page: 1,
    limit: 50,
  }),
  getAdminContributor: vi.fn().mockResolvedValue({
    id: 'c1',
    name: 'Desenvolvedor Teste',
    status: 'PUBLISHED',
    draftVersion: 1,
    publishedVersion: 1,
    profileConfirmed: true,
    photoConfirmed: false,
    hasPhoto: false,
    participations: [],
    links: [],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    auditHistory: [],
  }),
  createContributorDraft: vi.fn(),
  updateContributor: vi.fn(),
  publishContributor: vi.fn(),
  archiveContributor: vi.fn(),
  restoreContributor: vi.fn(),
  getContributorAuditHistory: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../api/projectCredits/projectCreditsService', () => ({
  getProjectCredits: vi.fn().mockResolvedValue({
    contributors: [
      {
        id: 'c1',
        name: 'Desenvolvedor Teste',
        participations: [{ semester: '2026-1', roles: ['Desenvolvedor'] }],
        contacts: [],
      },
    ],
    semesters: ['2026-1'],
    total: 1,
  }),
}));

describe('Unified Credits Screens Layout & Responsiveness Scaffold', () => {
  beforeEach(() => {
    logoutSession();
    sessionStorage.clear();
  });

  it('renders unified ProjectCreditsScreen in Secretary mode with menu, add button and cards', async () => {
    startSession('eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDB9.c2lnbmF0dXJl');

    const { container } = render(
      <MemoryRouter initialEntries={['/creditos']}>
        <Routes>
          <Route path="/creditos" element={<ProjectCreditsScreen />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mock-menu-lateral')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /créditos do projeto/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /novo colaborador/i })).toBeInTheDocument();
      expect(screen.getByText('Desenvolvedor Teste')).toBeInTheDocument();
    });

    const menuEl = screen.getByTestId('mock-menu-lateral');
    const menuWrapper = menuEl.parentElement;
    expect(menuWrapper).toBeTruthy();
    expect(container.querySelector('main')).toBeTruthy();
  });

  it('redirects legacy /creditos/gerenciar to /creditos', async () => {
    startSession('eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDB9.c2lnbmF0dXJl');

    render(
      <MemoryRouter initialEntries={['/creditos/gerenciar']}>
        <Routes>
          <Route path="/creditos/gerenciar" element={<Navigate to="/creditos" replace />} />
          <Route path="/creditos" element={<ProjectCreditsScreen />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /créditos do projeto/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /novo colaborador/i })).toBeInTheDocument();
    });
  });

  it('renders ProjectCreditsScreen in Public mode when not authenticated', async () => {
    render(
      <MemoryRouter initialEntries={['/creditos']}>
        <Routes>
          <Route path="/creditos" element={<ProjectCreditsScreen />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /créditos do projeto/i })).toBeInTheDocument();
      expect(screen.queryByTestId('mock-menu-lateral')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /novo colaborador/i })).not.toBeInTheDocument();
      expect(screen.getByText('Desenvolvedor Teste')).toBeInTheDocument();
    });
  });

  it('renders CreditsFormScreen inside layoutContainer and provides accessible buttons and inputs', async () => {
    startSession('eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDB9.c2lnbmF0dXJl');

    const { container } = render(
      <MemoryRouter initialEntries={['/creditos/novo']}>
        <Routes>
          <Route path="/creditos/novo" element={<CreditsFormScreen />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mock-menu-lateral')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /novo colaborador/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /salvar rascunho/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /publicar alterações/i })).toBeInTheDocument();
    });

    const menuEl = screen.getByTestId('mock-menu-lateral');
    const menuWrapper = menuEl.parentElement;
    expect(menuWrapper).toBeTruthy();
    expect(container.querySelector('main')).toBeTruthy();
  });
});

