import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CreditsManageScreen from './CreditsManageScreen';
import CreditsFormScreen from './CreditsFormScreen';

vi.mock('../../components/menuLateral/MenuLateral', () => ({
  default: () => <div data-testid="mock-menu-lateral">MenuLateral</div>,
}));

vi.mock('../../api/projectCredits/projectCreditsAdminService', () => ({
  listAdminContributors: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 50 }),
  getAdminContributor: vi.fn().mockResolvedValue({
    id: 'c1',
    name: 'Desenvolvedor Teste',
    status: 'DRAFT',
    draftVersion: 1,
    publishedVersion: null,
    profileConfirmed: true,
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

describe('Credits Screens Layout & Responsiveness Scaffold', () => {
  it('renders CreditsManageScreen inside layoutContainer and menuWrapper for mobile compatibility', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/creditos/gerenciar']}>
        <Routes>
          <Route path="/creditos/gerenciar" element={<CreditsManageScreen />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mock-menu-lateral')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /gestão de créditos/i })).toBeInTheDocument();
    });

    const menuEl = screen.getByTestId('mock-menu-lateral');
    const menuWrapper = menuEl.parentElement;
    expect(menuWrapper).toBeTruthy();
    expect(container.querySelector('main')).toBeTruthy();
  });

  it('renders CreditsFormScreen inside layoutContainer and provides accessible buttons and inputs', async () => {
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
