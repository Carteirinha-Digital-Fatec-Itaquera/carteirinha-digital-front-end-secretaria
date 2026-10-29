import styles from './ParticipantsPanel.module.css';
import { useState } from 'react';
import type { AttendanceView } from '../../../domains/Attendance';
import { reusableParticipantList } from './reusableParticipantList';
export default function ReusableParticipantExport({ items, eventId }: { items: AttendanceView[]; eventId: string }) {
  const [criterion, setCriterion] = useState('confirmed');
  const [excluded, setExcluded] = useState<string[]>([]);
  const eligible = items.filter(item => criterion === 'all' || item.status === 'CONFIRMED');
  const selected = eligible.filter(item => !excluded.includes(item.id));
  const download = (format: 'json' | 'csv') => {
    const content = reusableParticipantList(selected, eventId, format);
    const url = URL.createObjectURL(new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `nomes-reutilizaveis-${eventId}.${format}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <details style={{ width: '100%', padding: 12, border: '1px solid #ccdce0', borderRadius: 12 }}>
    <summary style={{ minHeight: 44, cursor: 'pointer', color: '#005c6d', fontWeight: 600 }}>Exportar nomes para outra palestra</summary>
    <p>Somente nomes e tipo de participante serão exportados. A outra palestra exigirá conferência e confirmação da participação.</p>
    <label>Quem incluir <select value={criterion} onChange={event => { setCriterion(event.target.value); setExcluded([]); }}><option value="confirmed">Presença confirmada</option><option value="all">Todos os participantes desta lista</option></select></label>
    <div style={{ maxHeight: 240, overflowY: 'auto' }}>{eligible.map(item => <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}><input type="checkbox" checked={!excluded.includes(item.id)} onChange={() => setExcluded(ids => ids.includes(item.id) ? ids.filter(id => id !== item.id) : [...ids, item.id])} />{item.studentName} · {item.studentRa ? 'Aluno' : 'Visitante'}</label>)}</div>
    <p role="status">{selected.length} nomes selecionados. Visitantes exigirão revisão individual no destino.</p>
    <button style={{ minHeight: 44 }} className={styles.csvButton} type="button" disabled={!selected.length || selected.length > 1000} onClick={() => download('csv')}>Baixar nomes em CSV</button>{' '}
    <button style={{ minHeight: 44 }} className={styles.csvButton} type="button" disabled={!selected.length || selected.length > 1000} onClick={() => download('json')}>Baixar nomes em JSON</button>
    {selected.length > 1000 && <p role="alert">Selecione até 1.000 nomes por arquivo.</p>}
  </details>;
}
