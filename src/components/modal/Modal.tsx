import { useEffect, useRef, type ReactNode } from 'react';
import styles from './style.module.css';
export default function Modal({ label, onDismiss, children }: { label: string; onDismiss?: () => void; children: ReactNode }) {
 const ref = useRef<HTMLDialogElement>(null);
 useEffect(() => { const node = ref.current; const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null; node?.showModal(); return () => { node?.close(); opener?.focus({preventScroll:true}); }; }, []);
 return <dialog ref={ref} className={styles.dialog} aria-label={label} onCancel={event => { event.preventDefault(); onDismiss?.(); }}><div className={styles.content}>{children}</div></dialog>;
}
