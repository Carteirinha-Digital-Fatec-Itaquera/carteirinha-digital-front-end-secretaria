import { CircleCheckBig, CircleX, Info, TriangleAlert } from 'lucide-react';
import Modal from '../modal/Modal';
import styles from './style.module.css';

export type MessageTone = 'success' | 'info' | 'warning' | 'error';

type MessageModalProps = {
  visible: boolean;
  tone?: MessageTone;
  title: string;
  message: string;
  details?: string[];
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  onDismiss?: () => void;
};

const iconByTone = {
  success: CircleCheckBig,
  info: Info,
  warning: TriangleAlert,
  error: CircleX,
} as const;

export default function MessageModal({
  visible,
  tone = 'info',
  title,
  message,
  details = [],
  confirmText = 'OK',
  cancelText,
  onConfirm,
  onCancel,
  onDismiss,
}: MessageModalProps) {
  if (!visible) return null;

  const Icon = iconByTone[tone];
  const toneClass = {
    success: styles.success,
    info: styles.info,
    warning: styles.warning,
    error: styles.error,
  }[tone];

  const messageRole = tone === 'error' ? 'alert' : tone === 'success' ? 'status' : undefined;

  return (
    <Modal label={title} onDismiss={onDismiss}>
      <div className={styles.wrapper}>
        <div className={`${styles.iconBox} ${toneClass}`} aria-hidden="true">
          <Icon size={28} strokeWidth={2} />
        </div>

        <div className={styles.copy}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.message} role={messageRole}>{message}</p>

          {details.length > 0 && (
            <ul className={styles.details}>
              {details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.actions}>
          {cancelText && onCancel && (
            <button type="button" className={styles.secondaryButton} onClick={onCancel}>
              {cancelText}
            </button>
          )}

          <button type="button" className={styles.primaryButton} onClick={onConfirm} autoFocus>
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
