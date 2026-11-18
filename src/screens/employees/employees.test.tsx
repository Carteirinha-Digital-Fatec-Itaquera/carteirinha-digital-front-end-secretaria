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
let createErrors: Array<Response>;
let inviteErrors: Array<Response>;

beforeEach(() => {
  logoutSession();
  requests = [];
  access = inactiveAccess;
  version = 3;
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
    return json({ ...detail, version });
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
    fill('Matrícula funcional', 'FUNC-001');
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
});
