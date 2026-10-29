import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Modal from '../../../components/modal/Modal';
import './regularization.css';

export default function RegularizationDialog({ title, description, onClose, children }: {
  title: string; description: string; onClose: () => void; children: ReactNode;
}) {
  return createPortal(<Modal label={title} onDismiss={onClose} className="regularization-dialog">
    <div className="regularization-dialog-header">
      <div><span className="regularization-eyebrow">Regularização de participantes</span><h2>{title}</h2><p>{description}</p></div>
      <button type="button" className="regularization-icon-button" aria-label="Fechar janela" onClick={onClose}><X size={20} aria-hidden="true" /></button>
    </div>
    {children}
  </Modal>, document.body);
}
