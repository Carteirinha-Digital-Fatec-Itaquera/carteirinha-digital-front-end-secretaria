import { useRef, useState } from 'react';
import { Expand, ImageOff, X } from 'lucide-react';
import Modal from '../../../components/modal/Modal';
import styles from './preview.module.css';

function Photo({ src, name, enlarged = false }: { src: string; name: string; enlarged?: boolean }) {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const unavailable = !src || state === 'failed';
  return (
    <div className={enlarged ? styles.preview : styles.thumbnail}>
      {!unavailable && <img src={src} alt={enlarged ? `Foto completa de ${name}` : ''}
        className={state === 'ready' ? styles.ready : styles.loading}
        onLoad={() => setState('ready')} onError={() => setState('failed')} />}
      {state !== 'ready' || unavailable ? <span className={styles.placeholder} role={enlarged ? 'status' : undefined}>
        {unavailable && <ImageOff size={28} aria-hidden="true" />}
        {unavailable ? 'Foto indisponível.' : 'Carregando foto...'}
      </span> : null}
    </div>
  );
}

export default function PendingPhotoPreview({ src, name }: { src: string; name: string }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };
  return (
    <div onClick={event => event.stopPropagation()}>
      <button ref={triggerRef} type="button" className={styles.trigger} aria-label={`Ampliar foto de ${name}`}
        aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <Photo key={src} src={src} name={name} />
        <span className={styles.badge} aria-hidden="true"><Expand size={16} /></span>
      </button>
      {open && <Modal label={`Foto de ${name}`} onDismiss={close}>
        <div className={styles.header}>
          <h2>Foto de {name}</h2>
          <button type="button" className={styles.close} aria-label="Fechar visualização da foto"
            autoFocus onClick={close}><X size={22} aria-hidden="true" /></button>
        </div>
        <Photo key={src} src={src} name={name} enlarged />
      </Modal>}
    </div>
  );
}
