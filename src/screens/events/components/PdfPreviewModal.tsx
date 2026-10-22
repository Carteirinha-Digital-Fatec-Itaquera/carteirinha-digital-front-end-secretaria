import { useEffect } from 'react';
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
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !pdfUrl) return null;

  function handleDownload() {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = 'certificado-previa.pdf';
    a.click();
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h5 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{title}</h5>
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
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Fechar modal"
            >
              ✕
            </button>
          </div>
        </div>
        <div className={styles.modalBody}>
          <iframe
            src={pdfUrl}
            title="Prévia do PDF oficial"
            className={styles.pdfIframe}
          />
        </div>
      </div>
    </div>
  );
}
