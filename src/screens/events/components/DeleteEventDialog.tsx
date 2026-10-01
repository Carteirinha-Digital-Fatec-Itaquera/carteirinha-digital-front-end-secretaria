import { useEffect, useState } from "react";
import { FaTrashAlt, FaTimes } from "react-icons/fa";
import styles from "./DeleteEventDialog.module.css";

export interface DeleteEventDialogProps {
  isOpen: boolean;
  eventTitle: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isSubmitting?: boolean;
}

export function DeleteEventDialog({
  isOpen,
  eventTitle,
  onClose,
  onConfirm,
  isSubmitting = false,
}: DeleteEventDialogProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [internalLoading, setInternalLoading] = useState(false);

  const loading = isSubmitting || internalLoading;

  useEffect(() => {
    if (isOpen) {
      setLocalError(null);
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

  async function handleDelete() {
    if (loading) return;

    try {
      setLocalError(null);
      setInternalLoading(true);
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erro ao excluir o evento. Tente novamente.";
      setLocalError(msg);
    } finally {
      setInternalLoading(false);
    }
  }

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
        aria-labelledby="delete-dialog-title"
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          disabled={loading}
          aria-label="Fechar"
        >
          <FaTimes size={16} />
        </button>

        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <FaTrashAlt size={20} />
          </div>
          <div className={styles.headerText}>
            <h2 id="delete-dialog-title" className={styles.title}>
              Excluir Evento
            </h2>
            <p className={styles.subtitle}>
              Você tem certeza de que deseja excluir permanentemente o evento{" "}
              <strong>"{eventTitle}"</strong>?
            </p>
          </div>
        </div>

        <div className={styles.warningBox}>
          Esta ação é irreversível. Todos os dados associados a este evento,
          incluindo checkpoints e registros de presença vinculados, serão
          definitivamente removidos do sistema.
        </div>

        {localError && (
          <div className={styles.errorAlert} role="alert">
            {localError}
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={handleDelete}
            disabled={loading}
          >
            <FaTrashAlt size={14} />
            {loading ? "Excluindo..." : "Excluir Evento"}
          </button>
        </div>
      </div>
    </div>
  );
}
