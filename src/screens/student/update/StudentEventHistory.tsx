import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { management, openManagementPdf } from '../../../api/event/publicEventService';
import { formatEventDate, formatEventTime, formatWorkload } from '../../../utils/eventPresentation';

type HistoryEntry = {
  id: string; checkInAt: string | null; checkOutAt: string | null; status: string;
  event: { id: string; title: string; startsAt: string; workloadMinutes: number; status: string };
  certificate: { id: string; verificationCode: string; issuedAt: string; revokedAt: string | null;
    artifact: { state: string; deliveryState: string } | null } | null;
};

export default function StudentEventHistory({ ra }: { ra: string }) {
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [downloading, setDownloading] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void management<HistoryEntry[]>(`students/${encodeURIComponent(ra)}/history`, undefined, 'GET', controller.signal)
      .then(data => { if (!controller.signal.aborted) { setItems(data); setError(''); } })
      .catch(() => { if (!controller.signal.aborted) setError('Não foi possível carregar o histórico. Tente atualizar.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [ra, refresh]);
  async function download(id: string) {
    setDownloading(id); setError('');
    try { await openManagementPdf(`certificates/${id}/pdf`); }
    catch { setError('Não foi possível baixar o certificado. Tente novamente.'); }
    finally { setDownloading(null); }
  }
  return <section aria-labelledby="student-event-history" style={{ marginTop: 32, width: '100%' }}>
    <h2 id="student-event-history">Eventos e certificados</h2>
    <p>Participações registradas nesta conta. Horários de Brasília.</p>
    <button type="button" disabled={loading} onClick={() => { setLoading(true); setRefresh(n => n + 1); }}>Atualizar histórico</button>
    {loading ? <p role="status">Carregando histórico...</p> : <>
      {!error && items.length === 0 && <p>Nenhuma participação registrada para este aluno.</p>}
      {items.map(item => <article key={item.id} style={{ padding: 20, marginTop: 16, border: '1px solid #d6e0e5', borderRadius: 12, background: '#fff' }}>
        <h3>{item.event.title}</h3>
        <p>{formatEventDate(item.event.startsAt)} às {formatEventTime(item.event.startsAt)} · {formatWorkload(item.event.workloadMinutes)}</p>
        <p>{item.event.status === 'CANCELLED' ? 'Evento cancelado' : item.status === 'CONFIRMED' ? 'Presença confirmada' : 'Entrada registrada, saída pendente'}</p>
        <p>Entrada: {item.checkInAt ? `${formatEventDate(item.checkInAt)} às ${formatEventTime(item.checkInAt)}` : 'Não registrada'}<br />
          Saída: {item.checkOutAt ? `${formatEventDate(item.checkOutAt)} às ${formatEventTime(item.checkOutAt)}` : 'Não registrada'}</p>
        {item.certificate ? <>
          <p>Certificado: {item.certificate.revokedAt ? 'Revogado' : item.certificate.artifact?.state === 'READY' ? 'Disponível' : 'Emitido, PDF em processamento'}<br />
            Emitido em {formatEventDate(item.certificate.issuedAt)} · Código: {item.certificate.verificationCode}</p>
          {!item.certificate.revokedAt && item.event.status !== 'CANCELLED' && item.certificate.artifact?.state === 'READY' && <button type="button" disabled={downloading !== null} onClick={() => void download(item.certificate!.id)}>Baixar certificado</button>}
        </> : <p>Sem certificado emitido.</p>}
        <p><Link to={`/eventos/${item.event.id}/gerenciar`}>Acessar evento</Link></p>
      </article>)}
    </>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
