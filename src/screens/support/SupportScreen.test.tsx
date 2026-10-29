import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SupportScreen from './SupportScreen';
import { apiRequest } from '../../api/config/apiRequest';
vi.mock('../../api/config/apiRequest', () => ({ apiRequest: vi.fn() }));
vi.mock('../../components/menuLateral/MenuLateral', () => ({ default: () => <nav>Menu administrativo</nav> }));
const ticket = { id: 'ticket', protocol: 'SUP-TESTE', subject: 'Conferir cadastro', category: 'DATA', status: 'IN_PROGRESS', version: 2, assignedSecretaryId: 1, studentName: 'Nome de uso', studentRa: '123', assigneeName: 'Secretaria', createdAt: '2026-10-28T10:00:00Z', proposedValue: '<script>teste</script>' };
describe('Atendimento de suporte', () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset().mockImplementation(async path => {
      if (path.endsWith('/assignees')) return [{ id: 1, name: 'Secretaria' }];
      if (path.endsWith('/audit')) return [];
      if (path.endsWith('/read')) return { success: true };
      return { ticket, viewerSecretaryId: 1, messages: [{ id: 'message', authorRole: 'STUDENT', body: '<img src=x onerror=alert(1)>', createdAt: ticket.createdAt }], messageNextCursor: null };
    });
  });
  afterEach(cleanup);
  const setup = () => render(<MemoryRouter initialEntries={['/suporte/ticket']}><Routes><Route path="/suporte/:id" element={<SupportScreen />} /></Routes></MemoryRouter>);
  it('escapes message text and requires explicit confirmation plus a response to resolve', async () => {
    setup();
    await screen.findByText('<img src=x onerror=alert(1)>');
    expect(document.querySelector('img')).toBeNull();
    const resolve = screen.getByRole('button', { name: 'Marcar como resolvido e avisar o aluno' });
    expect(resolve).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Resposta ao aluno'), { target: { value: 'Informação conferida no cadastro.' } });
    expect(resolve).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Confirmei a correção ou a orientação no fluxo adequado.'));
    fireEvent.click(resolve);
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/support/admin/tickets/ticket/status', expect.objectContaining({ body: expect.stringContaining('"confirmed":true') })));
  });
  it('keeps the written reply when a concurrent update rejects it', async () => {
    setup(); await screen.findByText('SUP-TESTE — Conferir cadastro');
    vi.mocked(apiRequest).mockImplementation(async path => { if (path.endsWith('/messages')) throw new Error('Solicitação alterada. Atualize antes de continuar.'); return {}; });
    fireEvent.change(screen.getByLabelText('Resposta ao aluno'), { target: { value: 'Resposta importante para preservar.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar resposta' }));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('Resposta ao aluno')).toHaveValue('Resposta importante para preservar.');
  });
  it('requires a reason and confirmation before cancelling an assigned request', async () => {
    setup(); await screen.findByText('SUP-TESTE — Conferir cadastro');
    const cancel=screen.getByRole('button',{name:'Cancelar solicitação'});
    expect(cancel).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Motivo para cancelar ou excluir'),{target:{value:'Solicitação duplicada conferida.'}});
    fireEvent.click(cancel);
    expect(screen.getByRole('dialog',{name:'Cancelar solicitação?'})).toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalledWith('/support/admin/tickets/ticket/cancel',expect.anything());
    fireEvent.click(screen.getByRole('button',{name:'Confirmar cancelamento'}));
    await waitFor(()=>expect(apiRequest).toHaveBeenCalledWith('/support/admin/tickets/ticket/cancel',expect.objectContaining({body:expect.stringContaining('"confirmed":true')})));
  });
  it('does not delete when the operator dismisses confirmation', async () => {
    setup(); await screen.findByText('SUP-TESTE — Conferir cadastro');
    fireEvent.change(screen.getByLabelText('Motivo para cancelar ou excluir'),{target:{value:'Registro duplicado.'}});
    fireEvent.click(screen.getByRole('button',{name:'Excluir solicitação'}));
    expect(screen.getByRole('dialog',{name:'Excluir solicitação?'})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Voltar'}));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(apiRequest).not.toHaveBeenCalledWith('/support/admin/tickets/ticket/delete',expect.anything());
  });
});
