import React from 'react';
import type { AttendanceView } from '../../../domains/Attendance';
import { formatEventTime } from '../../../utils/eventPresentation';
import styles from './ParticipantsPanel.module.css';

export interface ParticipantsPanelProps {
  items: AttendanceView[];
  loading: boolean;
  refreshing: boolean;
  stale: boolean;
  error: string | null;
  lastUpdatedAt: Date | null;
  onRefresh: () => void;
}

export const ParticipantsPanel: React.FC<ParticipantsPanelProps> = ({
  items,
  loading,
  refreshing,
  stale,
  error,
  lastUpdatedAt,
  onRefresh,
}) => {
  return (
    <section className={styles.panel} aria-labelledby="participants-panel-title">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h2 id="participants-panel-title" className={styles.title}>
            Participantes
          </h2>
          <span className={styles.badgeCount}>
            {items.length} {items.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        <button
          type="button"
          className={styles.refreshButton}
          onClick={onRefresh}
          disabled={loading || refreshing}
          aria-label="Atualizar lista de participantes"
        >
          {refreshing ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {stale && (
        <div className={styles.staleAlert} role="status">
          <span>
            ⚠️ Exibindo dados em cache ({lastUpdatedAt ? `atualizado às ${formatEventTime(lastUpdatedAt.toISOString())}` : 'desatualizado'}). Ocorreu uma falha na última sincronização.
          </span>
        </div>
      )}

      {error && !stale && (
        <div className={styles.errorAlert} role="alert">
          <span>{error}</span>
          <button type="button" className={styles.retryButton} onClick={onRefresh}>
            Tentar novamente
          </button>
        </div>
      )}

      {loading ? (
        <div className={styles.loadingState} role="status">
          Carregando participantes...
        </div>
      ) : items.length === 0 ? (
        <div className={styles.emptyState}>
          Nenhum participante registrado até o momento.
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">RA</th>
                <th scope="col">Curso</th>
                <th scope="col">Entrada</th>
                <th scope="col">Saída</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((attendance) => (
                <tr key={attendance.id}>
                  <td>{attendance.studentName}</td>
                  <td>{attendance.studentRa}</td>
                  <td>{attendance.studentCourse}</td>
                  <td>{attendance.checkInAt ? formatEventTime(attendance.checkInAt) : '—'}</td>
                  <td>{attendance.checkOutAt ? formatEventTime(attendance.checkOutAt) : '—'}</td>
                  <td>
                    {attendance.status === 'CONFIRMED' ? (
                      <span className={styles.statusConfirmed}>Presença confirmada</span>
                    ) : (
                      <span className={styles.statusCheckedIn}>Aguardando saída</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
