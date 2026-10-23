import { useEffect, useRef } from 'react';
import styles from './styleCertificatePreview.module.css';

export interface PdfPreviewModalProps {
  isOpen: boolean;
  pdfUrl: string | null;
  onClose: () => void;
  title?: string;
}

export function PdfPreviewModal({
  isOpen,
  pdfUrl,
  onClose,
  title = 'Conferência do PDF do Certificado',
}: PdfPreviewModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    // Foco inicial no botão de fechar para acessibilidade
    const timer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 50);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      // Focus trap / contenção de foco
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previousActiveElementRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen || !pdfUrl) return null;

  function handleDownload() {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = 'certificado-conferencia-rascunho.pdf';
    a.click();
  }

  return (
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-modal-title"
    >
      <div
        ref={modalRef}
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h5 id="pdf-modal-title" style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
              {title}
            </h5>
            <span className={styles.previewBadge}>Sem validade</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className={styles.conferirPdfBtn}
              onClick={handleDownload}
            >
              ⬇ Baixar Cópia PDF
            </button>
            <button
              ref={closeBtnRef}
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Fechar modal de conferência"
            >
              ✕
            </button>
          </div>
        </div>
        <div className={styles.modalBody}>
          <iframe
            src={pdfUrl}
            title="Prévia do PDF oficial de conferência"
            className={styles.pdfIframe}
          />
        </div>
      </div>
    </div>
  );
}
