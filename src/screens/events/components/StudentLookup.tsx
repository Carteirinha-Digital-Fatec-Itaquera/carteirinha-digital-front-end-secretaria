import { useRef, useState } from 'react';
import { management } from '../../../api/event/publicEventService';
type Candidate = { ra: string; accountId: string; name: string; course: string; status: string; email: string };
export default function StudentLookup() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const version = useRef(0);
  async function search() {
    const current = ++version.current; setBusy(true); setSelected(null); setItems([]);
    try {
      const result = await management<{ total: number; items: Candidate[] }>(`students/search?q=${encodeURIComponent(query)}`);
      if (current !== version.current) return;
      setItems(result.items); setMessage(result.total > 20 ? 'Mais de 20 resultados. Refine o nome.' : result.total ? 'Confira e selecione o aluno correto.' : 'Nenhum aluno encontrado. Confira o cadastro.');
    } catch { if (current === version.current) setMessage('Falha ao buscar. Tente novamente.'); }
    finally { if (current === version.current) setBusy(false); }
  }
  return <div>
    <label>Buscar aluno por nome ou RA<input value={query} maxLength={160} onChange={e => { version.current++; setQuery(e.target.value); setSelected(null); setItems([]); setMessage(''); setBusy(false); }} /></label>
    <button type="button" disabled={busy || query.trim().length < 3} onClick={() => void search()}>Buscar aluno</button>
    <p role="status">{message}</p>
    {items.map(item => <label key={item.accountId}><input type="radio" name="studentChoice" checked={selected?.accountId === item.accountId} onChange={() => setSelected(item)} />{item.name} · {item.course} · {item.status} · RA {item.ra} · {item.email}</label>)}
    <input name="ra" aria-label="RA selecionado" value={selected?.ra || ''} readOnly required />
    <input type="hidden" name="expectedAccountId" value={selected?.accountId || ''} />
    <p>Selecione o cadastro antes de confirmar a participação. O certificado será vinculado a esta conta.</p>
  </div>;
}
