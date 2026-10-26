import { useEffect, useRef, useState, type FormEvent } from 'react';
import { management } from '../../../api/event/publicEventService';
import styles from './ParticipantsPanel.module.css';

export function ManualCheckoutDialog({ eventId, attendanceId, name, onSaved, onClose }: {
  eventId: string; attendanceId: string; name: string; onSaved: () => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = ref.current; dialog?.showModal();
    return () => { dialog?.close(); opener?.focus({ preventScroll: true }); };
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (locked.current) return;
    const reason = String(new FormData(e.currentTarget).get('reason') || '').trim();
    if (reason.length < 10) { setError('Descreva a justificativa com pelo menos 10 caracteres.'); return; }
    locked.current = true; setBusy(true); setError('');
    try {
      await management(`events/${eventId}/manual-presence`, { attendanceId, checkpoint: 'CHECK_OUT', reason });
      onSaved(); onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível confirmar a presença. Tente novamente.');
    } finally { locked.current = false; setBusy(false); }
  }
  return <dialog ref={ref} className={`${styles.dialogBox} ${styles.nativeDialog}`} aria-labelledby="manual-checkout-title"
    onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>
    <h3 id="manual-checkout-title">Registrar saída e confirmar presença</h3>
    <p>Participante: <strong>{name}</strong></p>
    <p>A entrada já registrada será preservada. A saída será confirmada agora, sem QR Code, com seu nome e justificativa na auditoria. O certificado será emitido se estiver habilitado no evento.</p>
    <form onSubmit={e => void submit(e)}>
      <label htmlFor="manual-checkout-reason">Justificativa obrigatória</label>
      <textarea id="manual-checkout-reason" name="reason" required minLength={10} maxLength={1000} rows={4} disabled={busy} className={styles.manualReason} autoFocus />
      {error && <p role="alert">{error}</p>}
      <div className={styles.dialogActions}>
        <button type="button" onClick={onClose} disabled={busy}>Cancelar</button>
        <button type="submit" disabled={busy}>{busy ? 'Confirmando...' : 'Confirmar presença manual'}</button>
      </div>
    </form>
  </dialog>;
}
