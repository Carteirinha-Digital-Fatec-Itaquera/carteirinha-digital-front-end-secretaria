import { useEffect, useRef, useState, type FormEvent } from 'react';
import { management } from '../../../api/event/publicEventService';
import styles from './ParticipantsPanel.module.css';

type Target = { id: string; name: string };
type Props = { eventId: string; onSaved: (completedIds?: string[]) => void; onClose: () => void } & (
  { attendanceId: string; name: string; attendances?: never } | { attendanceId?: never; name?: never; attendances: Target[] }
);
export function ManualCheckoutDialog({ eventId, attendanceId, name, attendances, onSaved, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const completed = useRef(new Set<string>());
  const [completedCount, setCompletedCount] = useState(0);
  const targets: Target[] = attendances ?? [{ id: attendanceId!, name: name! }];
  const bulk = attendances !== undefined;
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = ref.current; dialog?.showModal();
    return () => { dialog?.close(); opener?.focus({ preventScroll: true }); };
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (locked.current) return;
    const form = new FormData(e.currentTarget);
    const reason = String(form.get('reason') || '').trim();
    if (bulk && form.get('bulkConfirmed') !== 'on') { setError('Confirme a participação dos selecionados antes de continuar.'); return; }
    if (reason.length < 10) { setError('Descreva a justificativa com pelo menos 10 caracteres.'); return; }
    locked.current = true; setBusy(true); setError('');
    try {
      if (bulk) {
        const remaining = targets.filter(target => !completed.current.has(target.id));
        for (let offset = 0; offset < remaining.length; offset += 50) {
          const ids = remaining.slice(offset, offset + 50).map(target => target.id);
          const result = await management<{ processedIds: string[] }>(`events/${eventId}/manual-checkouts`, { attendanceIds: ids, reason, confirmed: true });
          if (!Array.isArray(result.processedIds) || ids.some(id => !result.processedIds.includes(id))) throw new Error('Resposta incompleta. Atualize a lista antes de tentar novamente.');
          ids.forEach(id => completed.current.add(id));
          setCompletedCount(completed.current.size);
        }
        onSaved(Array.from(completed.current));
      } else {
        await management(`events/${eventId}/manual-presence`, { attendanceId, checkpoint: 'CHECK_OUT', reason });
        onSaved();
      }
      onClose();
    } catch (failure) {
      if (bulk && completed.current.size) onSaved(Array.from(completed.current));
      const message = failure instanceof Error ? failure.message : 'Não foi possível confirmar a presença. Tente novamente.';
      setError(bulk ? `${completed.current.size} de ${targets.length} processados. ${message} Os restantes continuam selecionados; nova tentativa não repete os concluídos.` : message);
    } finally { locked.current = false; setBusy(false); }
  }
  return <dialog ref={ref} className={`${styles.dialogBox} ${styles.nativeDialog}`} aria-labelledby="manual-checkout-title"
    onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>
    <h3 id="manual-checkout-title">{bulk ? "Confirmar saídas em massa" : "Registrar saída e confirmar presença"}</h3>
    {bulk ? <><p><strong>{targets.length} participantes selecionados.</strong> Até 50 por requisição, sem QR Code.</p><details><summary>Conferir participantes</summary><ul>{targets.map(target => <li key={target.id}>{target.name}</li>)}</ul></details></> : <p>Participante: <strong>{name}</strong></p>}
    <p>A entrada já registrada será preservada. A saída será confirmada agora, sem QR Code, com seu nome e justificativa na auditoria. O certificado será emitido se estiver habilitado no evento.</p>
    <form onSubmit={e => void submit(e)}>
      <label htmlFor="manual-checkout-reason">Justificativa obrigatória</label>
      <textarea id="manual-checkout-reason" name="reason" required minLength={10} maxLength={1000} rows={4} disabled={busy} className={styles.manualReason} autoFocus />
      {bulk && <label className={styles.bulkConfirm}><input name="bulkConfirmed" type="checkbox" required disabled={busy} />Confirmo a participação e a saída dos participantes selecionados.</label>}
      {bulk && <p role="status">{completedCount} de {targets.length} processados.</p>}
      {error && <p role="alert">{error}</p>}
      <div className={styles.dialogActions}>
        <button type="button" onClick={onClose} disabled={busy}>Cancelar</button>
        <button type="submit" disabled={busy}>{busy ? 'Confirmando...' : bulk ? 'Confirmar saídas selecionadas' : 'Confirmar presença manual'}</button>
      </div>
    </form>
  </dialog>;
}
