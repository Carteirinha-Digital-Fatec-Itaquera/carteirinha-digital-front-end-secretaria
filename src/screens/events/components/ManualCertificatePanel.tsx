import { LoadingComp } from '../../../components/loading/LoadingComp';
import { useRef, useState, type FormEvent } from 'react';
import { management, openManagementPdf, type Participant } from '../../../api/event/publicEventService';
import type { EventView } from '../../../domains/Event';
import styles from './ManualCertificatePanel.module.css';
import StudentLookup from './StudentLookup';
import ParticipantFilePanel from './ParticipantFilePanel';

type Result = {
  certificateId: string; verificationCode: string; recipientName: string; email: string;
  alreadyIssued: boolean; deliveryState: string; artifactState: string; message: string;
};
const deliveryLabel: Record<string, string> = {
  PENDING: 'Envio na fila', DISPATCHING: 'Envio em processamento', SENT: 'E-mail aceito pelo provedor',
  FAILED: 'Falha no envio', AMBIGUOUS: 'Envio com resultado incerto: use a reconciliação no painel de participantes',
  EXPIRED: 'Envio indisponível', NONE: 'Envio não programado',
};
export function ManualCertificatePanel({ event, onUpdated }: { event: EventView; onUpdated: () => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'notes'|'file'|'individual'>('notes');
  const attempt = useRef<{body:string;requestId:string}|null>(null);
  const [identityType, setIdentityType] = useState('STUDENT');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const locked = useRef(false);
  const blocked = event.status === 'CANCELLED' || event.status === 'SCHEDULED' || !event.certificateEnabled;
  async function run(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try { await action(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível concluir. Tente novamente.'); }
    finally { locked.current = false; setBusy(false); }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    await run(async () => {
      setResult(null);
      if (identityType === 'STUDENT' && !data.get('expectedAccountId')) throw new Error('Busque e selecione o aluno antes de confirmar.');
      const body = {
        identityType,
        ...(identityType === 'STUDENT' ? { ra: String(data.get('ra')).trim(), expectedAccountId: String(data.get('expectedAccountId') || '') || undefined } : {
          name: String(data.get('name')).trim(), email: String(data.get('email')).trim(),
          cpf: String(data.get('cpf')).trim(), course: String(data.get('course') || '').trim() || undefined,
        }),
        reason: String(data.get('reason')).trim(), participationConfirmed: data.get('confirmed') === 'on',
      };
      const serialized=JSON.stringify(body);
      if(attempt.current?.body!==serialized)attempt.current={body:serialized,requestId:crypto.randomUUID()};
      const response = await management<Result>(`events/${event.id}/manual-certificates`, {...body,requestId:attempt.current.requestId});
      attempt.current=null; setResult(response); onUpdated();
    });
  }
  async function refreshStatus() {
    if (!result) return;
    const people = await management<Participant[]>(`events/${event.id}/participants`);
    const certificate = people.find(person => person.certificate?.id === result.certificateId)?.certificate;
    if (!certificate?.artifact) throw new Error('Não foi possível obter a situação do envio. Tente novamente.');
    setResult({ ...result, deliveryState: certificate.artifact.deliveryState, artifactState: certificate.artifact.state });
  }
  return <section className={styles.panel} aria-labelledby="manual-certificate-title">
    <div className={styles.header}><div><h2 id="manual-certificate-title">Regularizar participantes</h2>
      <p>Regularize a participação de quem não conseguiu registrar presença pelo aplicativo.</p></div>
      <button type="button" disabled={busy} onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls="manual-certificate-form">{open ? 'Recolher regularização' : 'Regularizar participantes'}</button>
    </div>
    {open && <div id="manual-certificate-form">
      {blocked ? <><p role="alert">A emissão está disponível apenas para eventos iniciados, não cancelados e com certificados habilitados. Você pode preparar e exportar a lista abaixo.</p><ParticipantFilePanel key={event.id} event={event} onUpdated={onUpdated}/></> : <>

        <details><summary>Como funciona a regularização?</summary><p>Confira a participação antes de registrar. O sistema usa o certificado deste evento e envia um link por e-mail, sem anexar o PDF.</p></details>
        <div className="regularization-actions" role="group" aria-label="Forma de preparar participantes">{([['notes','Anotar nomes'],['file','Importar JSON/CSV'],['individual','Adicionar uma pessoa']] as const).map(([value,label])=><button type="button" key={value} aria-pressed={mode===value} disabled={busy} onClick={()=>setMode(value)}>{label}</button>)}</div>
        <div hidden={mode==='individual'}><ParticipantFilePanel key={event.id} event={event} onUpdated={onUpdated} mode={mode==='file'?'file':'notes'}/></div>
        <div hidden={mode!=='individual'}>
        {busy&&<div role="status" aria-live="polite"><LoadingComp/>Aguardando confirmação do servidor. Não é necessário enviar novamente.</div>}
        <form onSubmit={e => void submit(e)} className={styles.form}>
          <fieldset disabled={busy}><legend>Identificação do participante</legend>
            <label>Tipo de identificação<select value={identityType} onChange={e => { setIdentityType(e.target.value); setResult(null); }}><option value="STUDENT">Aluno cadastrado</option><option value="EXTERNAL">Pessoa sem conta na carteirinha</option></select></label>
            {identityType === 'STUDENT' ? <StudentLookup /> : <div className={styles.grid}>
              <label>Nome completo<input name="name" required minLength={3} maxLength={160} autoComplete="name" /></label>
              <label>E-mail para envio<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
              <label>CPF<input name="cpf" required inputMode="numeric" maxLength={14} pattern="[0-9]{11}|[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}" /></label>
              <label>Curso (opcional)<input name="course" maxLength={120} /></label>
              <p>Não cria conta nem senha. O destinatário acessará o certificado pelo CPF, durante o prazo de retenção do evento.</p>
            </div>}
            <label>Justificativa da regularização<textarea name="reason" required minLength={10} maxLength={1000} rows={3} placeholder="Descreva a falha e como a participação foi conferida." /></label>
            <label className={styles.confirm}><input name="confirmed" type="checkbox" required />Confirmo que esta pessoa participou desta atividade e conferi seus dados.</label>
            <button type="submit">{busy ? 'Processando...' : 'Confirmar participação e enfileirar envio'}</button>
          </fieldset>
        </form>
        {result && <div role="status" className={styles.result}>
          <strong>{result.message}</strong>{result.recipientName&&<p>{result.recipientName}{result.email&&` — ${result.email}`}</p>}<p>Código: {result.verificationCode}</p>
          <p>{deliveryLabel[result.deliveryState] || 'Consultando envio'}. {result.artifactState !== 'READY' && 'PDF em processamento.'}</p>
          <div className={styles.actions}><button type="button" disabled={busy} onClick={() => void run(refreshStatus)}>Atualizar situação</button>
            {result.artifactState === 'READY' && <button type="button" disabled={busy} onClick={() => void run(async () => { await openManagementPdf(`certificates/${result.certificateId}/pdf`); })}>Baixar certificado</button>}
            {(!['AMBIGUOUS', 'DISPATCHING'].includes(result.deliveryState) && (result.deliveryState === 'FAILED' || result.artifactState === 'RENDER_FAILED')) && <button type="button" disabled={busy} onClick={() => void run(async () => { await management(`certificates/${result.certificateId}/retry`, {}); await refreshStatus(); })}>Tentar envio novamente</button>}
          </div>
        </div>}
        </div>
      </>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </div>}
  </section>;
}
