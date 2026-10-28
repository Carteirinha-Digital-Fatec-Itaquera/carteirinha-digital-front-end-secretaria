import { useEffect, useRef, useState } from 'react';
import { management, openManagementPdf } from '../../../api/event/publicEventService';
import styles from './ManualCertificatePanel.module.css';
export default function ReissueCertificateDialog({ certificateId, version, onClose, onSaved }: { certificateId: string; version: number; onClose: () => void; onSaved: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const requestId = useRef(crypto.randomUUID());
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [reason, setReason] = useState('');
  const [kind, setKind] = useState('SOCIAL_NAME');
  const [save, setSave] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<{ id: string; version: number; verificationCode: string; revokedAt: string | null }[]>([]);
  useEffect(() => { const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null; const element = dialog.current; element?.showModal(); return () => { element?.close(); opener?.focus({ preventScroll: true }); }; }, []);
  const payload = () => ({ requestId: requestId.current, expectedVersion: version, correctionType: kind, name: name.trim(), course: course.trim() || undefined, reason: reason.trim(), saveSocialName: save && kind === 'SOCIAL_NAME', confirmed: true });
  async function run(preview: boolean) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      if (preview) await openManagementPdf(`certificates/${certificateId}/reissue-preview`, payload());
      else { await management(`certificates/${certificateId}/reissue`, payload()); onSaved(); onClose(); }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível reemitir.'); }
    finally { lock.current = false; setBusy(false); }
  }
  const valid = name.trim().length >= 3 && reason.trim().length >= 10;
  async function loadHistory() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { setHistory(await management(`certificates/${certificateId}/versions`)); }
    catch { setError('Não foi possível consultar o histórico de versões.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <dialog ref={dialog} className={styles.panel} aria-labelledby="reissue-heading" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} style={{ width: 'min(560px, 90vw)', maxHeight: '85vh', overflow: 'auto', borderRadius: 12, padding: 24, margin: 'auto', boxSizing: 'border-box' }}>
    <h2 id="reissue-heading">Corrigir e reemitir certificado</h2>
    <p>O documento anterior será revogado. Uma nova versão será processada e o aluno receberá um link. A presença e os horários serão preservados.</p>
    <button type="button" disabled={busy} onClick={() => void loadHistory()}>Consultar histórico de versões</button>
    {history.length > 0 && <ul aria-label="Histórico administrativo de versões">{history.map(item => <li key={item.id}>Versão {item.version}: {item.revokedAt ? 'Revogada' : 'Vigente'} · {item.verificationCode}</li>)}</ul>}
    <fieldset className={styles.form} disabled={busy} style={{ display: 'grid', gap: 12, border: 0, padding: 0, minWidth: 0 }}>
      <label>Tipo de correção<select value={kind} onChange={e => setKind(e.target.value)}><option value="SOCIAL_NAME">Nome social</option><option value="SPELLING">Grafia do nome</option><option value="COURSE">Curso</option></select></label>
      <label>Nome correto no certificado<input value={name} maxLength={160} onChange={e => setName(e.target.value)} /></label>
      <label>Curso corrigido (opcional)<input value={course} maxLength={120} onChange={e => setCourse(e.target.value)} /></label>
      <label>Justificativa<textarea rows={3} value={reason} maxLength={1000} onChange={e => setReason(e.target.value)} /></label>
      <p>Descreva o atendimento sem repetir o nome anterior.</p>
      {kind === 'SOCIAL_NAME' && <label className={styles.confirm}><input type="checkbox" checked={save} onChange={e => setSave(e.target.checked)} />Salvar este nome social no cadastro para futuras emissões</label>}
      <button type="button" disabled={!valid} onClick={() => void run(true)}>Conferir prévia sem validade</button>
      <label className={styles.confirm}><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />Conferi a pessoa e autorizo revogar a versão anterior e emitir a corrigida</label>
      <button type="button" style={{ background: '#b71923', borderColor: '#b71923' }} disabled={!valid || !confirmed} onClick={() => void run(false)}>Revogar anterior e reemitir</button>
      <button type="button" onClick={onClose}>Cancelar</button>
    </fieldset>
    {error && <p role="alert">{error}</p>}
    {busy && <p role="status">Processando...</p>}
  </dialog>;
}
