import React, { useEffect, useRef, useState } from "react";
import { FaExclamationTriangle, FaTimes } from "react-icons/fa";
import styles from "./styleCancelEventDialog.module.css";

export interface CancelEventDialogProps {
  isOpen: boolean;
  eventTitle: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function CancelEventDialog({
  isOpen,
  eventTitle,
  onClose,
  onConfirm,
  isSubmitting = false,
}: CancelEventDialogProps) {
  const [reason, setReason] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [internalLoading, setInternalLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loading = isSubmitting || internalLoading;

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setLocalError(null);
      // Foco automático no campo de justificativa ao abrir
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    }

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setLocalError("A justificativa deve conter no mínimo 3 caracteres.");
      textareaRef.current?.focus();
      return;
    }
    if (trimmed.length > 1000) {
      setLocalError("A justificativa não pode ultrapassar 1000 caracteres.");
      return;
    }

    try {
      setLocalError(null);
      setInternalLoading(true);
      await onConfirm(trimmed);
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erro ao cancelar o evento. Tente novamente.";
      setLocalError(msg);
    } finally {
      setInternalLoading(false);
    }
  }

  const isValid = reason.trim().length >= 3 && reason.trim().length <= 1000;

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-dialog-title"
        aria-describedby="cancel-dialog-description"
      >
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <FaExclamationTriangle className={styles.warningIcon} aria-hidden="true" />
            <h2 id="cancel-dialog-title" className={styles.title}>
              Cancelar Evento
            </h2>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={loading}
            aria-label="Fechar modal"
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.body}>
            <p className={styles.eventName}>
              Evento: <strong>{eventTitle}</strong>
            </p>

            <div id="cancel-dialog-description" className={styles.alertBox}>
              <strong>Atenção: Ação Definitiva</strong>
              Ao cancelar este evento, todos os checkpoints serão fechados
              imediatamente e quaisquer certificados já emitidos para os
              participantes serão <u>revogados de forma irreversível</u>.
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="cancel-reason-textarea" className={styles.label}>
                Justificativa do cancelamento
                <span className={styles.required}>*</span>
              </label>
              <textarea
                id="cancel-reason-textarea"
                ref={textareaRef}
                className={styles.textarea}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (localError) setLocalError(null);
                }}
                placeholder="Informe o motivo formal do cancelamento (mínimo 3 caracteres)..."
                rows={3}
                maxLength={1000}
                disabled={loading}
                required
              />
              <div className={styles.charCounter}>
                <span>{reason.length} / 1000 caracteres</span>
              </div>
            </div>

            {localError && (
              <div className={styles.errorMessage} role="alert">
                {localError}
              </div>
            )}
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={loading}
            >
              Manter Evento
            </button>
            <button
              type="submit"
              className={styles.confirmBtn}
              disabled={loading || !isValid}
            >
              {loading ? "Cancelando..." : "Confirmar Cancelamento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
export default CancelEventDialog;
