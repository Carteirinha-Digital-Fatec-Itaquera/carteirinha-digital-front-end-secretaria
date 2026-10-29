import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import StudentLookup from './StudentLookup';
import { management } from '../../../api/event/publicEventService';
vi.mock('../../../api/event/publicEventService', () => ({ management: vi.fn() }));
const candidate = { ra: '001', accountId: 'account', name: 'Álvaro Teste', course: 'DSM', status: 'Ativo', email: 'a***@test' };

it('confirms selection explicitly in the dialog and retains the committed identity when a replacement is cancelled', async () => {
  vi.mocked(management).mockResolvedValue({ total: 1, items: [candidate] });
  const onSelect = vi.fn();
  render(<form aria-label="Identificação"><StudentLookup onSelect={onSelect} /></form>);
  const form = screen.getByRole('form') as HTMLFormElement;
  fireEvent.click(screen.getByRole('button', { name: 'Buscar aluno' }));
  const dialog = screen.getByRole('dialog', { name: 'Selecionar aluno' });
  expect(within(dialog).getByRole('button', { name: 'Buscar aluno' })).toBeDisabled();
  fireEvent.change(within(dialog).getByLabelText('Buscar aluno por nome ou RA'), { target: { value: 'Alvaro' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Buscar aluno' }));
  fireEvent.click(await within(dialog).findByRole('radio', { name: /Álvaro Teste/ }));
  expect(new FormData(form).get('ra')).toBe('');
  expect(onSelect).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Usar cadastro selecionado' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(new FormData(form).get('ra')).toBe('001');
  expect(new FormData(form).get('expectedAccountId')).toBe('account');
  expect(onSelect).toHaveBeenLastCalledWith(candidate);
  fireEvent.click(screen.getByRole('button', { name: 'Trocar aluno' }));
  fireEvent.change(screen.getByLabelText('Buscar aluno por nome ou RA'), { target: { value: 'Outro' } });
  expect(screen.getByRole('button', { name: 'Usar cadastro selecionado' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(new FormData(form).get('expectedAccountId')).toBe('account');
});

it('clears a tentative selection in the embedded review when the query changes and never submits on Enter', async () => {
  vi.mocked(management).mockResolvedValue({ total: 1, items: [candidate] });
  const onSelect = vi.fn(), submit = vi.fn();
  render(<form onSubmit={submit}><StudentLookup inline onSelect={onSelect} initialQuery="Alvaro" /></form>);
  const input = screen.getByLabelText('Buscar aluno por nome ou RA');
  fireEvent.keyDown(input, { key: 'Enter' });
  fireEvent.click(await screen.findByRole('radio'));
  expect(onSelect).toHaveBeenLastCalledWith(candidate);
  fireEvent.change(input, { target: { value: 'Outro' } });
  expect(onSelect).toHaveBeenLastCalledWith(null);
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  expect(submit).not.toHaveBeenCalled();
});

it('shows an actionable search error and permits retry', async () => {
  vi.mocked(management).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({total:0,items:[]});
  render(<StudentLookup inline initialQuery="Alvaro" />);
  fireEvent.click(screen.getByRole('button', {name:'Buscar aluno'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Confira a conexão');
  fireEvent.click(screen.getByRole('button', {name:'Buscar aluno'}));
  expect(await screen.findByText(/Nenhum aluno encontrado/)).toBeInTheDocument();
});

it('ignores late search results after dismissing the dialog', async () => {
  let resolve!: (value: unknown) => void;
  vi.mocked(management).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  render(<StudentLookup />);
  fireEvent.click(screen.getByRole('button', {name:'Buscar aluno'}));
  fireEvent.change(screen.getByLabelText('Buscar aluno por nome ou RA'), {target:{value:'Alvaro'}});
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', {name:'Buscar aluno'}));
  fireEvent.click(screen.getByRole('button', {name:'Cancelar'}));
  resolve({total:1,items:[candidate]});
  fireEvent.click(screen.getByRole('button', {name:'Buscar aluno'}));
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
});
