import { useEffect, useRef, useState } from 'react';
import { management } from '../../../api/event/publicEventService';
export type Candidate = { ra: string; accountId: string; name: string; course: string; status: string; email: string };
export default function StudentLookup({onSelect,initialQuery=''}:{onSelect?:(candidate:Candidate|null)=>void;initialQuery?:string}={}) {
  const [query, setQuery] = useState(initialQuery);
  const [items, setItems] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const version = useRef(0);
  const controller = useRef<AbortController|null>(null);
  useEffect(()=>{const counter=version;return()=>{counter.current++;controller.current?.abort()}},[]);
  async function search() {
    controller.current?.abort();controller.current=new AbortController();
    const current = ++version.current; setBusy(true); setSelected(null); onSelect?.(null); setItems([]);
    try {
      const result = await management<{ total: number; items: Candidate[] }>(`students/search?q=${encodeURIComponent(query)}`,undefined,'GET',AbortSignal.any([controller.current.signal,AbortSignal.timeout(15000)]));
      if (current !== version.current) return;
      setItems(result.items); setMessage(result.total > 20 ? 'Mais de 20 resultados. Refine o nome.' : result.total ? 'Confira e selecione o aluno correto.' : 'Nenhum aluno encontrado. Confira o cadastro.');
    } catch { if (current === version.current) setMessage('Falha ao buscar. Tente novamente.'); }
    finally { if (current === version.current) setBusy(false); }
  }
  return <div>
    <label>Buscar aluno por nome ou RA<input value={query} maxLength={160} onChange={e => { version.current++; setQuery(e.target.value); setSelected(null); onSelect?.(null); setItems([]); setMessage(''); setBusy(false); }} /></label>
    <button type="button" disabled={busy || query.trim().length < 3} onClick={() => void search()}>Buscar aluno</button>
    <p role="status">{message}</p>
    {items.map(item => <label key={item.accountId}><input type="radio" name="studentChoice" checked={selected?.accountId === item.accountId} onChange={() => {setSelected(item);onSelect?.(item)}} />{item.name} · {item.course} · {item.status} · RA {item.ra} · {item.email}</label>)}
    <input type="hidden" name="ra" value={selected?.ra || ''} />{selected && <div className="regularization-selected"><strong>{selected.name}</strong><p>RA {selected.ra} · {selected.course} · {selected.email}</p></div>}
    <input type="hidden" name="expectedAccountId" value={selected?.accountId || ''} />
    <p>Selecione o cadastro antes de confirmar a participação. O certificado será vinculado a esta conta.</p>
  </div>;
}
