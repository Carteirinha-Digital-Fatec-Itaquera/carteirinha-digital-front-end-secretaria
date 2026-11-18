import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { logoutSession, startSession } from '../../api/auth/session';

const jwt = (role: string) => 'e30.' + btoa(JSON.stringify({ sub: role === 'secretary' ? 1 : 'employee', role, exp: 4102444800 })).replace(/=+$/, '') + '.c2ln';
const id = '00000000-0000-4000-8000-000000000001';
const detail = {
  id, name: 'Pessoa de Teste', socialName: 'Nome Social', displayName: 'Nome Social',
  email: 'teste@example.test', registrationNumber: 'FUNC-001', rg: 'RG-FICTICIO',
  admissionDate: '2026-01-01', accountStatus: 'ACTIVE', version: 3,
  assignments: [
    { id: 'role-1', title: 'Docente', startsOn: '2026-01-02', validUntil: null, effectiveStatus: 'ACTIVE' },
    { id: 'role-2', title: 'Coordenação', startsOn: null, validUntil: '2026-12-31', effectiveStatus: 'ACTIVE' },
  ],
};
const inactiveAccess = { passwordDefined: false, lastLoginAt: null, lastAccessRequestAt: null, lastDeliveryState: null };
const json = (value: unknown, status = 200) => Response.json(value, { status });
let requests: Array<{ path: string; method: string; body: Record<string, unknown> | null; token: string | null }>;
let access: typeof inactiveAccess | (Omit<typeof inactiveAccess, 'lastDeliveryState' | 'lastAccessRequestAt'> & {
  lastDeliveryState: string;
  lastAccessRequestAt: string;
});
let version: number;
let archived: boolean;
let editConflict: boolean;
let currentName: string;
let createErrors: Array<Response>;
let inviteErrors: Array<Response>;

beforeEach(() => {
  logoutSession();
  requests = [];
  access = inactiveAccess;
  version = 3;
  archived = false;
  editConflict = false;
  currentName = detail.name;
  createErrors = [];
  inviteErrors = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';
    if (!url.pathname.startsWith('/funcionarios')) return json(url.pathname.endsWith('/summary') ? { pending: 0 } : []);
    const token = new Headers(init?.headers).get('Authorization');
    requests.push({ path: url.pathname + url.search, method, token, body: init?.body ? JSON.parse(String(init.body)) : null });
    if (token !== 'Bearer ' + jwt('secretary')) return json({ message: 'Acesso proibido' }, 403);
    if (url.pathname === '/funcionarios' && method === 'POST') return createErrors.shift() ?? json(detail, 201);
    if (url.pathname === '/funcionarios') return json({ items: [{ ...detail, assignmentTitles: ['Docente', 'Coordenação'] }], nextCursor: null });
    if (url.pathname.endsWith('/acesso')) return json(access);
    if (url.pathname.endsWith('/convite')) {
      const response = inviteErrors.shift();
      if (response) { version++; return response; }
      access = { ...inactiveAccess, lastDeliveryState: 'ACCEPTED', lastAccessRequestAt: '2026-11-18T12:00:00Z' };
      return json({ requested: true, deliveryState: access.lastDeliveryState, requestedAt: access.lastAccessRequestAt }, 201);
    }
    if (method === 'PATCH' && url.pathname === '/funcionarios/' + id && editConflict) {
      editConflict = false;
      version++;
      currentName = 'Nome atualizado pela Secretaria';
      return json({ code: 'VERSION_CONFLICT' }, 409);
    }
    if (method === 'PATCH' || method === 'DELETE' || method === 'POST') {
      const body = JSON.parse(String(init?.body));
      if (body.expectedVersion !== version) return json({ code: 'VERSION_CONFLICT' }, 409);
      version++;
      if (body.name) currentName = body.name;
      if (method === 'DELETE') archived = true;
      if (url.pathname.endsWith('/restaurar')) archived = false;
    }
    return json({ ...detail, name: currentName, version, accountStatus: archived ? 'ARCHIVED' : 'ACTIVE' });
  }));
});
afterEach(() => { cleanup(); logoutSession(); vi.unstubAllGlobals(); });

function open(path: string, role = 'secretary') {
  startSession(jwt(role));
  window.history.replaceState({}, '', path);
  render(<App />);
}
const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
function fillRequired() {
  fill('Nome completo *', 'Pessoa de Teste');
  fill('E-mail *', 'teste@example.test');
  fill('Data de admissão *', '2026-01-01');
  fill('Cargo ou função *', 'Docente');
  fill('Matrícula funcional *', 'FUNC-001');
}

describe('Funcionários da Secretaria', () => {
  it('separa a área administrativa de sessões de funcionário', () => {
    open('/funcionarios/novo', 'employee');
    expect(screen.getByText('Login secretaria')).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });

  it.each(['Nome Social', 'teste@example.test', 'FUNC-001'])('pesquisa %s e abre o cadastro', async query => {
    open('/funcionarios');
    await screen.findByRole('link', { name: 'Nome Social' });
    fill('Nome, e-mail ou matrícula funcional', query);
    press('Pesquisar');
    await waitFor(() => expect(requests.some(call => new URLSearchParams(call.path.split('?')[1]).get('q') === query)).toBe(true));
    fireEvent.click(await screen.findByRole('link', { name: 'Nome Social' }));
    expect(await screen.findByText('Aguardando ativação')).toBeInTheDocument();
    expect(screen.getByText('RG-FICTICIO')).toBeInTheDocument();
    expect(requests.some(call => call.path === '/funcionarios/' + id + '/acesso')).toBe(true);
  });

  it('valida campos, registra opcionais e duas funções, sem enviar o convite automaticamente', async () => {
    open('/funcionarios/novo');
    const form = screen.getByRole('button', { name: 'Salvar cadastro' }).closest('form')!;
    expect(form.checkValidity()).toBe(false);
    fillRequired();
    fill('Nome social', 'Nome Social');
      fill('RG', 'RG-FICTICIO');
    fill('Início da função', '2026-01-02');
    fill('Término da função', '2026-01-01');
    press('Salvar cadastro');
    expect(await screen.findByText(/término de uma função/)).toBeInTheDocument();
    expect(requests).toHaveLength(0);
    fill('Término da função', '');
    press('Adicionar função');
    const second = within(screen.getByRole('group', { name: 'Função 2' }));
    fireEvent.change(second.getByLabelText('Cargo ou função *'), { target: { value: 'Coordenação' } });
    fireEvent.change(second.getByLabelText('Término da função'), { target: { value: '2026-12-31' } });
    press('Salvar cadastro');
    expect(await screen.findByText(/Funcionário registrado/)).toBeInTheDocument();
    expect(requests.find(call => call.method === 'POST')?.body).toEqual({
      requestId: expect.stringMatching(/^[\da-f-]{36}$/), name: detail.name, socialName: detail.socialName,
      email: detail.email, registrationNumber: detail.registrationNumber, rg: detail.rg, admissionDate: detail.admissionDate,
      assignments: [{ title: 'Docente', startsOn: '2026-01-02' }, { title: 'Coordenação', validUntil: '2026-12-31' }],
    });
    expect(requests.some(call => call.path.endsWith('/convite'))).toBe(false);
  });

  it('mostra e-mail duplicado e erros Nest, mantendo a chave para o mesmo cadastro', async () => {
    createErrors = [json({ code: 'EMAIL_ALREADY_EXISTS' }, 409), json({ message: ['Admissão inválida', 'Cadastro inválido'] }, 400)];
    open('/funcionarios/novo');
    fillRequired();
    press('Salvar cadastro');
    expect(await screen.findByText('Já existe um funcionário com este e-mail.')).toBeInTheDocument();
    press('Salvar cadastro');
    expect(await screen.findByText('Admissão inválida. Cadastro inválido')).toBeInTheDocument();
    let posts = requests.filter(call => call.method === 'POST');
    expect(posts[1].body?.requestId).toBe(posts[0].body?.requestId);
    expect(posts[0].body).not.toHaveProperty('rg');
    fill('E-mail *', 'outro@example.test');
    press('Salvar cadastro');
    await screen.findByText(/Funcionário registrado/);
    posts = requests.filter(call => call.method === 'POST');
    expect(posts[2].body?.requestId).not.toBe(posts[0].body?.requestId);
  });

  it('confirma o convite, recarrega a versão no 409 e verifica o estado de ativação', async () => {
    inviteErrors = [json({ code: 'VERSION_CONFLICT', message: 'Versão desatualizada' }, 409)];
    open('/funcionarios/' + id);
    await screen.findByRole('button', { name: 'Enviar convite' });
    press('Enviar convite');
    expect(requests.filter(call => call.method === 'POST')).toHaveLength(0);
    press('Confirmar envio');
    expect(await screen.findByText(/O cadastro mudou/)).toBeInTheDocument();
    await screen.findByRole('button', { name: 'Enviar convite' });
    press('Enviar convite');
    press('Confirmar envio');
    await screen.findByRole('button', { name: 'Reenviar convite' });
    expect(screen.getByRole('status')).toHaveTextContent('Envio aceito pelo serviço de e-mail');
    const posts = requests.filter(call => call.method === 'POST');
    expect(posts.map(call => call.body?.expectedVersion)).toEqual([3, 4]);
    expect(posts[0].body?.requestId).not.toBe(posts[1].body?.requestId);
    access = { ...access, passwordDefined: true };
    press('Atualizar situação');
    expect(await screen.findByText('Acesso ativado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reenviar convite' })).not.toBeInTheDocument();
  });
  it('preserva a edição em conflito e envia apenas os campos alterados', async () => {
    editConflict = true;
    open('/funcionarios/' + id);
    await screen.findByRole('button', { name: 'Editar funcionário' });
    press('Editar funcionário');
    fill('Nome completo', 'Nome editado');
    const form = within(screen.getByRole('group', { name: 'Dados cadastrais' }));
    fireEvent.change(form.getByLabelText('Motivo da alteração'), { target: { value: 'Correção cadastral' } });
    press('Salvar dados');
    expect(await screen.findByText('Nome atualizado pela Secretaria')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome completo')).toHaveValue('Nome editado');
    press('Salvar dados');
    expect(await screen.findByText('Alteração salva.')).toBeInTheDocument();
    expect(requests.filter(call => call.method === 'PATCH').map(call => call.body)).toEqual([
      { name: 'Nome editado', expectedVersion: 3, reason: 'Correção cadastral' },
      { name: 'Nome editado', expectedVersion: 4, reason: 'Correção cadastral' },
    ]);
  });

  it('edita e inclui funções em operações versionadas', async () => {
    open('/funcionarios/' + id);
    await screen.findByRole('button', { name: 'Editar funcionário' });
    press('Editar funcionário');
    const existing = within(screen.getByRole('group', { name: 'Docente' }));
    fireEvent.change(existing.getByLabelText('Cargo ou função'), { target: { value: 'Docente responsável' } });
    fireEvent.change(existing.getByLabelText('Motivo da alteração'), { target: { value: 'Ajustar função' } });
    fireEvent.click(existing.getByRole('button', { name: 'Salvar função' }));
    await screen.findByRole('button', { name: 'Editar funcionário' });
    press('Editar funcionário');
    const addition = within(screen.getByRole('group', { name: 'Nova função' }));
    fireEvent.change(addition.getByLabelText('Cargo ou função'), { target: { value: 'Coordenação' } });
    fireEvent.change(addition.getByLabelText('Motivo da alteração'), { target: { value: 'Novo vínculo' } });
    fireEvent.click(addition.getByRole('button', { name: 'Incluir função' }));
    await screen.findByRole('button', { name: 'Editar funcionário' });
    expect(requests.filter(call => call.path.includes('/funcoes')).map(call => [call.method, call.body?.expectedVersion])).toEqual([['PATCH', 3], ['POST', 4]]);
  });

  it('arquiva e restaura com confirmação e motivo', async () => {
    open('/funcionarios/' + id);
    await screen.findByRole('button', { name: 'Excluir funcionário' });
    press('Excluir funcionário');
    expect(screen.getByRole('button', { name: 'Confirmar arquivamento' })).toBeDisabled();
    fill('Motivo', 'Encerramento de vínculo');
    press('Confirmar arquivamento');
    await screen.findByText('Funcionário arquivado. O acesso foi revogado.');
    fireEvent.click(screen.getByLabelText('Mostrar arquivados'));
    await waitFor(() => expect(requests.some(call => call.path.includes('includeArchived=true'))).toBe(true));
    fireEvent.click(await screen.findByRole('link', { name: 'Nome Social' }));
    await screen.findByRole('button', { name: 'Restaurar funcionário' });
    press('Restaurar funcionário');
    fill('Motivo', 'Revisão administrativa');
    press('Confirmar restauração');
    expect(await screen.findByText(/Funcionário restaurado/)).toBeInTheDocument();
    expect(requests.find(call => call.method === 'DELETE')?.body).toEqual({ expectedVersion: 3, reason: 'Encerramento de vínculo' });
    expect(requests.find(call => call.path.endsWith('/restaurar'))?.body).toEqual({ expectedVersion: 4, reason: 'Revisão administrativa' });
  });
});
