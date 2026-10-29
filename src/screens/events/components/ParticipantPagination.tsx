import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './ParticipantsPanel.module.css';

export default function ParticipantPagination({ total, page, onChange, pageSize = 25 }: {
  total: number; page: number; onChange: (page: number) => void; pageSize?: number;
}) {
  const count = Math.ceil(total / pageSize);
  if (!total) return null;
  const pages = [...new Set([0, count - 1, page - 1, page, page + 1])].filter(index => index >= 0 && index < count).sort((a, b) => a - b);
  return <div className={styles.pagination}>
    <p role="status">Exibindo {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} de {total} participantes</p>
    {count > 1 && <nav aria-label="Páginas da lista de presença">
      <button type="button" aria-label="Página anterior de participantes" disabled={page === 0} onClick={() => onChange(page - 1)}><ChevronLeft size={17} aria-hidden="true" /></button>
      {pages.map((index, position) => <span key={index}>
        {position > 0 && index > pages[position - 1] + 1 && <span className={styles.pageGap} aria-hidden="true">…</span>}
        <button type="button" aria-label={`Ir para página ${index + 1}`} aria-current={page === index ? 'page' : undefined} onClick={() => onChange(index)}>{index + 1}</button>
      </span>)}
      <button type="button" aria-label="Próxima página de participantes" disabled={page === count - 1} onClick={() => onChange(page + 1)}><ChevronRight size={17} aria-hidden="true" /></button>
    </nav>}
  </div>;
}
