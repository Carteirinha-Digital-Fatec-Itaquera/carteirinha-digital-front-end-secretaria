import { useEffect, useState } from 'react';
import { X, Clock, User } from 'lucide-react';
import {
  getContributorHistory,
  type ContributorHistoryResponse,
} from '../../api/projectCredits/projectCreditsAdminService';
import type { AdminAuditLogItem } from '../../domains/ProjectCredits';
import styles from './styleCreditsAdmin.module.css';

interface CreditsHistoryModalProps {
  contributorId: string;
  contributorName: string;
  isOpen: boolean;
  onClose: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  DRAFT_CREATED: 'Rascunho Criado',
  DRAFT_SAVED: 'Rascunho Salvo',
  PUBLISHED: 'Publicação Aprovada',
  ARCHIVED: 'Colaborador Arquivado',
  RESTORED: 'Restaurado para Rascunho',
  PHOTO_UPDATED: 'Foto Atualizada',
  PHOTO_REMOVED: 'Foto Removida',
};

function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export default function CreditsHistoryModal({
  contributorId,
  contributorName,
  isOpen,
  onClose,
}: CreditsHistoryModalProps) {
  const [historyState, setHistoryState] = useState<{
    id: string | null;
    data: ContributorHistoryResponse | null;
    error: string | null;
  }>({ id: null, data: null, error: null });

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    getContributorHistory(contributorId, 1, 50)
      .then((res) => {
        if (mounted) {
          setHistoryState({ id: contributorId, data: res, error: null });
        }
      })
      .catch((err) => {
        if (mounted) {
          setHistoryState({
            id: contributorId,
            data: null,
            error: err.message || 'Erro ao carregar histórico',
          });
        }
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, contributorId]);

  const loading = isOpen && historyState.id !== contributorId;
  const data = historyState.id === contributorId ? historyState.data : null;
  const error = historyState.id === contributorId ? historyState.error : null;

  if (!isOpen) return null;

  return (
    <div
      className={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
    >
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <div>
            <h2 id="history-modal-title">Histórico de Alterações</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: 'var(--app-color-muted)' }}>
              {contributorName}
            </p>
          </div>
          <button
            type="button"
            className={styles.iconActionButton}
            onClick={onClose}
            aria-label="Fechar modal de histórico"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '24px 0', color: 'var(--app-color-muted)' }}>
              Carregando auditoria...
            </p>
          ) : error ? (
            <div className={styles.conflictAlert}>
              <p>{error}</p>
            </div>
          ) : data?.history.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '24px 0', color: 'var(--app-color-muted)' }}>
              Nenhum registro de alteração encontrado.
            </p>
          ) : (
            <div className={styles.timeline}>
              {data?.history.map((item: AdminAuditLogItem) => (
                <div key={item.id} className={styles.timelineItem}>
                  <div className={styles.timelineDot} />
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineHeader}>
                      <span className={styles.timelineAction}>
                        {ACTION_LABELS[item.action] || item.action}
                      </span>
                      <span className={styles.timelineDate}>
                        <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                    <div className={styles.timelineAuthor}>
                      <User size={13} style={{ display: 'inline', marginRight: 4 }} />
                      Realizado por: <strong>{item.performedByName || 'Secretaria'}</strong>
                    </div>
                    {item.metadata && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: '0.8rem',
                          background: '#fff',
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        {item.metadata.reason ? (
                          <p style={{ margin: 0 }}>
                            Motivo: <em>{String(item.metadata.reason)}</em>
                          </p>
                        ) : null}
                        {item.metadata.note ? (
                          <p style={{ margin: 0 }}>
                            Nota: <em>{String(item.metadata.note)}</em>
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
