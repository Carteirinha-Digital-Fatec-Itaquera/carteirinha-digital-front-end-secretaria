import { useRef, useState } from 'react';
import { apiRequest } from '../../../api/config/apiRequest';
import { management } from '../../../api/event/publicEventService';
import type { EventView } from '../../../domains/Event';
import { formatEventDate, formatEventTime } from '../../../utils/eventPresentation';
type Row = { row: number; name: string; status: string; ra?: string; accountId?: string; officialName?: string; message?: string };
const labels: Record<string, string> = { READY: 'Localizado e elegível', REVIEW: 'Revisão manual necessária', AMBIGUOUS: 'Mais de um aluno com este nome', NOT_FOUND: 'Nome exato não encontrado', INELIGIBLE: 'Cadastro inativo ou e-mail inválido', DUPLICATE: 'Duplicado neste arquivo', RUNNING: 'Processando', DONE: 'Certificado emitido ou já existente; consulte o envio', ERROR: 'Falha: pode tentar novamente' };
export default function ParticipantFilePanel({ event, onUpdated }: { event: EventView; onUpdated: () => void }) {
  const [opened, setOpened] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  async function analyze() {
    if (!file || lock.current) return;
    lock.current = true; setBusy(true); setError(''); setRows([]); setConfirmed(false);
    try {
      const body = new FormData(); body.append('file', file);
      const result = await apiRequest<{ items: Row[] }>(`/event-management/events/${event.id}/participant-file`, { method: 'POST', body });
      setRows(result.items);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Falha ao analisar arquivo.'); }
    finally { lock.current = false; setBusy(false); }
  }
  async function issue() {
    if (lock.current || !confirmed || reason.trim().length < 10) return;
    lock.current = true; setBusy(true); setError('');
    try {
      for (const row of rows.filter(item => ['READY', 'ERROR'].includes(item.status))) {
        const update = (status: string, message?: string) => setRows(previous => previous.map(item => item.row === row.row ? { ...item, status, message } : item));
        update('RUNNING');
        try {
          const result = await management<{ message: string }>(`events/${event.id}/manual-certificates`, { identityType: 'STUDENT', ra: row.ra, expectedAccountId: row.accountId, participationConfirmed: true, reason: `${reason.trim()} [arquivo: linha ${row.row}]`.slice(0, 1000) });
          update('DONE', result.message);
        } catch (failure) { update('ERROR', failure instanceof Error ? failure.message : 'Falha de conexão.'); }
      }
      onUpdated();
    } finally { lock.current = false; setBusy(false); }
  }
  const pending = rows.filter(row => ['READY', 'ERROR'].includes(row.status)).length;
  if (!opened) return <button type="button" onClick={() => setOpened(true)}>Importar JSON ou CSV de participantes</button>;
  return <section aria-labelledby="file-participants-title">
    <h3 id="file-participants-title">Importar participantes por JSON ou CSV</h3>
    <p>Evento: <strong>{event.title}</strong> · {formatEventDate(event.startsAt)} às {formatEventTime(event.startsAt)}.</p>
    <p>JSON: lista de nomes ou objeto com participantes. CSV: coluna nome_transcrito, nome ou name. Até 2 MB e 1.000 linhas. A análise não registra presenças nem envia e-mails.</p>
    <fieldset disabled={busy}>
      <label>Arquivo de participantes<input type="file" accept=".json,.csv" onChange={e => { setFile(e.target.files?.[0] || null); setRows([]); setConfirmed(false); setError(''); }} /></label>
      <button type="button" disabled={!file} onClick={() => void analyze()}>Analisar nomes</button>
    </fieldset>
    {rows.length > 0 && <>
      <p role="status">{rows.length} linhas analisadas. {pending} prontas ou com tentativa pendente. Revise a lista antes de confirmar.</p>
      <div style={{ maxHeight: 360, overflow: 'auto' }}><ol>{rows.map(row => <li key={row.row}><strong>{row.name}</strong> — {labels[row.status] || row.status}{row.officialName && ` · Cadastro: ${row.officialName} · RA ${row.ra}`} {row.message && <p>{row.message}</p>}</li>)}</ol></div>
      <p>Nomes ambíguos ou pendentes não serão emitidos. Use a busca individual para revisá-los. Duplicatas são ignoradas; documentos existentes são reutilizados.</p>
      <fieldset disabled={busy}>
        <label>Justificativa do lote<textarea minLength={10} maxLength={900} value={reason} onChange={e => setReason(e.target.value)} /></label>
        <label><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />Conferi os alunos e confirmo que participaram deste evento, nesta data e horário.</label>
        <button type="button" disabled={!confirmed || reason.trim().length < 10 || pending === 0} onClick={() => void issue()}>Confirmar e emitir {pending} certificado(s)</button>
      </fieldset>
    </>}
    {busy && <p role="status">Processando. Mantenha esta página aberta até concluir.</p>}
    {error && <p role="alert">{error}</p>}
    <p>Após a confirmação, o PDF e o e-mail com link são processados pela rotina existente. Aceite do provedor não comprova recebimento na caixa postal.</p>
  </section>;
}
