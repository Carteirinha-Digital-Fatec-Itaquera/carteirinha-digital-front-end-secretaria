import { useEffect, useId, useRef, useState } from 'react';
import { CheckCircle2, Search, UserRound, LoaderCircle } from 'lucide-react';
import { management } from '../../../api/event/publicEventService';
import RegularizationDialog from './RegularizationDialog';
import styles from './StudentLookup.module.css';

export type Candidate = { ra: string; accountId: string; name: string; course: string; status: string; email: string };
export default function StudentLookup({ onSelect, initialQuery = '', inline = false }: {
  onSelect?: (candidate: Candidate | null) => void; initialQuery?: string; inline?: boolean;
} = {}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [items, setItems] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [choice, setChoice] = useState<Candidate | null>(null);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const id = useId();
  const version = useRef(0);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => { const counter = version; return () => { counter.current++; controller.current?.abort(); }; }, []);
  function dismiss() {
    version.current++; controller.current?.abort(); setBusy(false); setOpen(false);
  }
  async function search() {
    if (query.trim().length < 3) return;
    controller.current?.abort(); controller.current = new AbortController();
    const current = ++version.current;
    setBusy(true); setChoice(null); setItems([]); setMessage(''); setFailed(false);
    if (inline) onSelect?.(null);
    try {
      const result = await management<{ total: number; items: Candidate[] }>(`students/search?q=${encodeURIComponent(query.trim())}`, undefined, 'GET', AbortSignal.any([controller.current.signal, AbortSignal.timeout(15000)]));
      if (current !== version.current) return;
      setItems(result.items);
      setMessage(result.total > 20 ? 'Exibindo até 20 resultados. Refine o nome ou informe o RA.' : result.total ? `${result.total} cadastro(s) encontrado(s). Confira os dados antes de selecionar.` : 'Nenhum aluno encontrado. Confira o nome ou tente buscar pelo RA.');
    } catch {
      if (current === version.current) { setFailed(true); setMessage('Não foi possível buscar os alunos. Confira a conexão e tente novamente.'); }
    } finally { if (current === version.current) setBusy(false); }
  }
  const searchContent = <div className={styles.lookup}>
    <label htmlFor={id}>Buscar aluno por nome ou RA</label>
    <div className={styles.searchBar}>
      <input id={id} type="search" value={query} maxLength={160} placeholder="Digite pelo menos 3 caracteres" autoFocus
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (!busy) void search(); } }}
        onChange={e => {
          version.current++; controller.current?.abort(); setQuery(e.target.value); setChoice(null);
          setItems([]); setMessage(''); setBusy(false);
          if (inline) onSelect?.(null);
        }} />
      <button type="button" disabled={busy || query.trim().length < 3} onClick={() => void search()}>
        {busy ? <LoaderCircle size={18} className={styles.spin} aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
        {busy ? 'Buscando...' : 'Buscar aluno'}
      </button>
    </div>
    <p role={failed ? 'alert' : 'status'} className={failed ? styles.error : styles.hint}>
      {busy ? 'Consultando os cadastros. Aguarde...' : message || 'Busque pelo nome completo ou RA para localizar o cadastro correto.'}
    </p>
    {!items.length && !busy && <div className={styles.empty}><Search size={28} aria-hidden="true" /><strong>{message ? 'Nenhum resultado disponível' : 'Encontre o participante'}</strong><span>A seleção vincula o certificado à conta do aluno.</span></div>}
    <div className={styles.results} role="radiogroup" aria-label="Cadastros encontrados" aria-busy={busy}>
      {items.map(item => <label key={item.accountId} className={`${styles.candidate} ${choice?.accountId === item.accountId ? styles.chosen : ''}`}>
        <input type="radio" name={`studentChoice-${id}`} checked={choice?.accountId === item.accountId} onChange={() => { setChoice(item); if (inline) onSelect?.(item); }} />
        <span className={styles.identity}><strong>{item.name}</strong><span>RA {item.ra} · {item.course}</span><span>{item.email}</span></span>
        <span className={styles.badge}>{item.status}</span>
      </label>)}
    </div>
    {!inline && <div className={styles.footer}>
      <button type="button" className={styles.secondary} onClick={dismiss}>Cancelar</button>
      <button type="button" disabled={!choice || busy} onClick={() => { if (!choice) return; setSelected(choice); onSelect?.(choice); dismiss(); }}><CheckCircle2 size={18} aria-hidden="true" />Usar cadastro selecionado</button>
    </div>}
  </div>;
  if (inline) return searchContent;
  return <div className={styles.lookup}>
    <div className={styles.selection}>
      <span className={styles.avatar}><UserRound size={24} aria-hidden="true" /></span>
      <div className={styles.identity}><strong>{selected?.name || 'Nenhum aluno selecionado'}</strong>
        <span>{selected ? `RA ${selected.ra} · ${selected.course}` : 'Localize e confira o cadastro antes de continuar.'}</span>
        {selected && <span>{selected.email}</span>}
      </div>
      <button type="button" className={styles.secondary} onClick={() => { setChoice(null); setOpen(true); }}><Search size={18} aria-hidden="true" />{selected ? 'Trocar aluno' : 'Buscar aluno'}</button>
    </div>
    <input type="hidden" name="ra" value={selected?.ra || ''} />
    <input type="hidden" name="expectedAccountId" value={selected?.accountId || ''} />
    {open && <RegularizationDialog title="Selecionar aluno" description="Busque o cadastro e confira nome, RA e curso para evitar vínculos incorretos." onClose={dismiss}>{searchContent}</RegularizationDialog>}
  </div>;
}
