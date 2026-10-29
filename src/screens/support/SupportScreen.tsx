import MessageModal from '../../components/messageModal/MessageModal';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import MenuLateral from '../../components/menuLateral/MenuLateral';
import { apiRequest } from '../../api/config/apiRequest';
import layout from '../../styles/layoutWithMenu.module.css';
import './support.css';
const statuses: Record<string, string> = { OPEN: 'Aberto', IN_PROGRESS: 'Em atendimento', WAITING_STUDENT: 'Aguardando aluno', RESOLVED: 'Resolvido', CLOSED: 'Encerrado' };
const categories: Record<string, string> = { DATA: 'Dados cadastrais', PHOTO_CARD: 'Foto ou carteirinha', EVENT: 'Presença em evento', CERTIFICATE: 'Certificado', ACCESS: 'Acesso à conta', OTHER: 'Outro problema' };
type Ticket = { closeReason?: string | null; id: string; protocol: string; subject: string; category: string; status: string; version: number; unread: boolean; studentName: string | null; studentRa: string | null; assignedSecretaryId: number | null; assigneeName: string | null; createdAt: string; eventId: string | null; certificateId: string | null; requestedField?: string; proposedValue?: string };
type Message = { id: string; authorRole: string; body: string; redactedAt: string | null; createdAt: string };
type Detail = { ticket: Ticket; messages: Message[]; messageNextCursor: string | null; viewerSecretaryId: number };
type Page = { items: Ticket[]; nextCursor: string | null };
type Audit = { id: string; action: string; actorRole: string; actorIdentity: string; createdAt: string; reason: string | null; resultReference: string | null };
const date = (value: string) => new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const request = <T,>(path: string, body?: object, method = 'POST', signal?: AbortSignal) => apiRequest<T>('/support/admin' + path, body ? { method, body: JSON.stringify(body), signal } : { signal });
export default function SupportScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dangerAction, setDangerAction] = useState<'cancel' | 'delete' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [page, setPage] = useState<Page>({ items: [], nextCursor: null });
  const [detail, setDetail] = useState<Detail | null>(null);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [assignees, setAssignees] = useState<{ id: number; name: string }[]>([]);
  const [filters, setFilters] = useState({ q: '', status: '', category: '', assignee: 'all', from: '', to: '' });
  const [applied, setApplied] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [assignee, setAssignee] = useState('');
  const [redactId, setRedactId] = useState('');
  const actionKey = useRef<{ payload: string; id: string } | null>(null);
  const epoch = useRef(0);
  const load = useCallback(async (signal?: AbortSignal) => {
    const current = ++epoch.current; setError('');
    try {
      if (id) {
        const [value, history, people] = await Promise.all([request<Detail>('/tickets/' + id, undefined, undefined, signal), request<Audit[]>('/tickets/' + id + '/audit', undefined, undefined, signal), request<{ id: number; name: string }[]>('/assignees', undefined, undefined, signal)]);
        if (signal?.aborted || current !== epoch.current) return;
        setDetail(value); setAudit(history); setAssignees(people);
        await request('/tickets/' + id + '/read', { version: value.ticket.version }, undefined, signal);
        window.dispatchEvent(new Event('support:updated'));
      } else {
        const value = await request<Page>('/tickets?' + applied, undefined, undefined, signal);
        if (!signal?.aborted && current === epoch.current) setPage(value);
      }
    } catch (e) { if (!signal?.aborted && current === epoch.current) setError(e instanceof Error ? e.message : 'Falha ao carregar atendimento.'); }
  }, [id, applied]);
  useEffect(() => {
    const counter = epoch; const controller = new AbortController();
    const refresh = () => { if (document.visibilityState !== 'hidden') void load(controller.signal); };
    queueMicrotask(() => { if (controller.signal.aborted) return; setDetail(null); setMessage(''); setReason(''); setConfirmed(false); actionKey.current = null; refresh(); });
    const timer = window.setInterval(refresh, 60000); window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { controller.abort(); counter.current++; window.clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [load]);
  async function act(action: string, extra: object = {}, method = 'POST') {
    if (!detail || !id) return;
    setBusy(true); setError('');
    const data = { expectedVersion: detail.ticket.version, ...(message.trim() ? { message: message.trim() } : {}), ...(reason.trim() ? { reason: reason.trim() } : {}), ...(reference.trim() ? { resultReference: reference.trim() } : {}), ...extra };
    const payload = JSON.stringify([action, data]);
    if (!actionKey.current || actionKey.current.payload !== payload) actionKey.current = { payload, id: crypto.randomUUID() };
    try { await request('/tickets/' + id + '/' + action, { ...data, requestId: actionKey.current.id }, method); actionKey.current = null; setMessage(''); setReason(''); setReference(''); setConfirmed(false); setRedactId(''); setActionReason(''); if (action === 'delete') { window.dispatchEvent(new Event('support:updated')); navigate('/suporte', { replace: true }); return; } await load(); window.dispatchEvent(new Event('support:updated')); }
    catch (e) { setError(e instanceof Error ? e.message : 'Falha ao salvar atendimento.'); } finally { setBusy(false); }
  }
  async function more(messages = false) {
    setBusy(true);
    try {
      if (messages && detail) { const older = await request<Detail>('/tickets/' + id + '?cursor=' + detail.messageNextCursor); setDetail({ ...detail, messages: [...older.messages, ...detail.messages], messageNextCursor: older.messageNextCursor }); }
      else { const next = await request<Page>('/tickets?' + applied + '&cursor=' + page.nextCursor); setPage({ items: [...page.items, ...next.items], nextCursor: next.nextCursor }); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao carregar.'); } finally { setBusy(false); }
  }
  const terminal = detail && ['RESOLVED', 'CLOSED'].includes(detail.ticket.status);
  const responsible = detail && detail.ticket.assignedSecretaryId === detail.viewerSecretaryId;
  return <div className={layout.layoutContainer}><div className={layout.menuWrapper}><MenuLateral /></div><main className="secretary-support" aria-busy={busy}>
    <h1>Suporte aos alunos</h1><p>Solicitações da carteirinha. Alterações cadastrais e reemissões continuam nos fluxos existentes.</p>
    {error && <div role="alert" className="support-error">{error} <button disabled={busy} onClick={() => void load()}>Atualizar atendimento</button></div>}
    {!id && <><form onSubmit={e => { e.preventDefault(); const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)); setApplied(query.toString()); }} className="support-tools">
      <label>Nome, RA, protocolo ou assunto<input value={filters.q} maxLength={120} onChange={e => setFilters({ ...filters, q: e.target.value })} /></label>
      <label>Situação<select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}><option value="">Todas</option>{Object.entries(statuses).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>Categoria<select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })}><option value="">Todas</option>{Object.entries(categories).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>Responsável<select value={filters.assignee} onChange={e => setFilters({ ...filters, assignee: e.target.value })}><option value="all">Todos</option><option value="mine">Meus atendimentos</option><option value="unassigned">Sem responsável</option></select></label>
      <label>Desde<input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} /></label><label>Até<input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} /></label><button>Filtrar</button>
    </form><p>Mais antigos primeiro. Aguardando aluno não compõe o contador de pendências.</p>
      {!error && !page.items.length && <p>Nenhuma solicitação encontrada.</p>}<ul>{page.items.map(ticket => <li key={ticket.id}><Link to={'/suporte/' + ticket.id}><strong>{ticket.protocol} — {ticket.subject}</strong></Link><p>{ticket.studentName || 'Conta removida'} · RA {ticket.studentRa || 'indisponível'} · {ticket.closeReason?.startsWith('CANCELLED_') ? 'Cancelado' : statuses[ticket.status]}{ticket.unread && ' · Nova atualização'}</p><p>{categories[ticket.category]} · {date(ticket.createdAt)} · {ticket.assigneeName || 'Sem responsável'}</p></li>)}</ul>{page.nextCursor && <button disabled={busy} onClick={() => void more()}>Carregar mais solicitações</button>}
    </>}
    {id && !detail && !error && <p role="status">Carregando atendimento…</p>}
    {detail && <><Link to="/suporte">Voltar à fila</Link><h2>{detail.ticket.protocol} — {detail.ticket.subject}</h2><p>{detail.ticket.studentName || 'Conta removida'} · {detail.ticket.closeReason?.startsWith('CANCELLED_') ? 'Cancelado' : statuses[detail.ticket.status]} · Responsável: {detail.ticket.assigneeName || 'não atribuído'}</p>
      {detail.ticket.proposedValue && <p>Informação proposta pelo aluno: {detail.ticket.proposedValue}. Confira antes de alterar o cadastro.</p>}
      <nav className="support-tools" aria-label="Ações relacionadas">{detail.ticket.studentRa && <Link to={'/update/' + encodeURIComponent(detail.ticket.studentRa)}>Conferir cadastro do aluno</Link>}{detail.ticket.category === 'PHOTO_CARD' && <Link to="/fotos">Conferir fotos pendentes</Link>}{detail.ticket.eventId && <Link to={'/eventos/' + detail.ticket.eventId + '/gerenciar'}>Conferir evento e certificados</Link>}</nav>
      <label>Motivo para cancelar ou excluir<input minLength={3} maxLength={1000} value={actionReason} onChange={e => setActionReason(e.target.value)} /></label><div className="support-tools">{!terminal && <button disabled={busy || actionReason.trim().length < 3} onClick={() => setDangerAction('cancel')}>Cancelar solicitação</button>}<button disabled={busy || actionReason.trim().length < 3} onClick={() => setDangerAction('delete')}>Excluir solicitação</button></div>
      <h3>Conversa</h3>{detail.messageNextCursor && <button disabled={busy} onClick={() => void more(true)}>Mensagens anteriores</button>}<ol className="support-conversation">{detail.messages.map(item => <li key={item.id}><strong>{item.authorRole === 'STUDENT' ? 'Aluno' : 'Secretaria'}</strong><time>{date(item.createdAt)}</time><p>{item.body}</p>{responsible && !item.redactedAt && <button disabled={busy} onClick={() => { setRedactId(item.id); setReason(''); }}>Remover conteúdo sensível desta mensagem</button>}</li>)}</ol>
      {redactId && <section aria-label="Remoção de conteúdo sensível"><p>A remoção é permanente. A auditoria preserva autor e data, sem copiar o conteúdo removido.</p><label>Justificativa<textarea minLength={3} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label><button disabled={busy || reason.trim().length < 3} onClick={() => void act('messages/' + redactId + '/redact')}>Confirmar remoção do conteúdo</button><button onClick={() => setRedactId('')}>Cancelar remoção</button></section>}
      {!terminal && <>
        {!detail.ticket.assignedSecretaryId && <button disabled={busy} onClick={() => void act('claim')}>Assumir atendimento</button>}
        <details><summary>Reatribuir atendimento</summary><label>Novo responsável<select value={assignee} onChange={e => setAssignee(e.target.value)}><option value="">Selecione</option>{assignees.map(person => <option value={person.id} key={person.id}>{person.name}</option>)}</select></label><label>Justificativa da reatribuição<textarea value={reason} maxLength={1000} onChange={e => setReason(e.target.value)} /></label><button disabled={busy || !assignee || reason.trim().length < 3} onClick={() => void act('assignee', { assigneeId: Number(assignee) }, 'PATCH')}>Reatribuir com justificativa</button></details>
        {responsible && <><label>Resposta ao aluno<textarea value={message} maxLength={3000} onChange={e => setMessage(e.target.value)} /></label><label>Referência da ação realizada (opcional)<input value={reference} maxLength={200} onChange={e => setReference(e.target.value)} /></label><div className="support-tools"><button disabled={busy || !message.trim()} onClick={() => void act('messages')}>Enviar resposta</button>{detail.ticket.status === 'IN_PROGRESS' && <button disabled={busy || !message.trim()} onClick={() => void act('status', { status: 'WAITING_STUDENT' })}>Solicitar informação ao aluno</button>}{detail.ticket.status === 'WAITING_STUDENT' && <button disabled={busy || !message.trim()} onClick={() => void act('status', { status: 'IN_PROGRESS' })}>Retomar atendimento</button>}</div><label className="support-check"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />Confirmei a correção ou a orientação no fluxo adequado.</label><button disabled={busy || !confirmed || !message.trim()} onClick={() => void act('status', { status: 'RESOLVED', confirmed })}>Marcar como resolvido e avisar o aluno</button></>}
      </>}
      <details><summary>Histórico de auditoria</summary><ul>{audit.map(item => <li key={item.id}>{item.action} · {item.actorRole === 'STUDENT' ? 'Aluno' : 'Secretaria'} · {date(item.createdAt)}{item.reason && <p>{item.reason}</p>}{item.resultReference && <p>Referência: {item.resultReference}</p>}</li>)}</ul></details>
    </>}
    <MessageModal visible={dangerAction !== null} tone="warning" title={dangerAction === 'delete' ? 'Excluir solicitação?' : 'Cancelar solicitação?'} message={dangerAction === 'delete' ? 'A solicitação será retirada das listas do aluno e da Secretaria. O histórico será preservado para auditoria.' : 'O atendimento será encerrado como cancelado, sem marcar o problema como resolvido.'} confirmText={dangerAction === 'delete' ? 'Confirmar exclusão' : 'Confirmar cancelamento'} cancelText="Voltar" onCancel={() => setDangerAction(null)} onDismiss={() => setDangerAction(null)} onConfirm={() => { const action = dangerAction; setDangerAction(null); if (action && !busy) void act(action, { reason: actionReason.trim(), confirmed: true }); }} />
  </main></div>;
}
