import { useRef, useState } from 'react';
import type { EventView } from '../../../domains/Event';
import { apiRequest } from '../../../api/config/apiRequest';
import styles from './ManualCertificatePanel.module.css';
export default function EventLocationPanel({ event, onSaved }: { event: EventView; onSaved: () => void }) {
  const [enabled, setEnabled] = useState(event.locationEnabled !== false && Boolean(event.geoPolicy));
  const [reason, setReason] = useState('');
  const [latitude, setLatitude] = useState(String(event.geoPolicy?.latitude ?? ''));
  const [longitude, setLongitude] = useState(String(event.geoPolicy?.longitude ?? ''));
  const [radius, setRadius] = useState(String(event.geoPolicy?.radius ?? 150));
  const [accuracy, setAccuracy] = useState(String(event.geoPolicy?.maxAccuracy ?? 50));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const lock = useRef(false);
  async function save() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage('');
    try {
      await apiRequest(`/events/${event.id}/location-verification`, { method: 'POST', body: JSON.stringify({ enabled, reason: reason.trim(), ...(enabled ? { geoPolicy: { latitude: Number(latitude), longitude: Number(longitude), radius: Number(radius), maxAccuracy: Number(accuracy) } } : {}) }) });
      setMessage('Verificação atualizada. Nenhuma presença ou certificado foi alterado.'); onSaved();
    } catch (failure) { setMessage(failure instanceof Error ? failure.message : 'Falha ao atualizar.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className={styles.panel} aria-labelledby="event-location-heading">
    <h2 id="event-location-heading">Verificação de geolocalização</h2>
    <p>Aplica-se a alunos e visitantes. Desligar dispensa o GPS e reduz a verificação de presença física; identidade, QR e confirmação continuam obrigatórios. A alteração fica auditada.</p>
    <fieldset disabled={busy || event.status === 'CANCELLED'} className={styles.form}>
      <label className={styles.confirm}><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />Exigir geolocalização neste evento</label>
      {enabled && <div className={styles.grid}>
        <label>Latitude<input type="number" step="any" min="-90" max="90" value={latitude} onChange={e => setLatitude(e.target.value)} /></label>
        <label>Longitude<input type="number" step="any" min="-180" max="180" value={longitude} onChange={e => setLongitude(e.target.value)} /></label>
        <label>Raio permitido (metros)<input type="number" value={radius} onChange={e => setRadius(e.target.value)} /></label>
        <label>Precisão máxima (metros)<input type="number" value={accuracy} onChange={e => setAccuracy(e.target.value)} /></label>
      </div>}
      <label>Justificativa da alteração<textarea maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label>
      <button type="button" disabled={reason.trim().length < 3 || (enabled && (!latitude || !longitude))} onClick={() => void save()}>Salvar verificação de localização</button>
    </fieldset>
    {message && <p role="status">{message}</p>}
  </section>;
}
