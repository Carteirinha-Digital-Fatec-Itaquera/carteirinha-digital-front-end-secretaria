import React, { useEffect, useRef, useState } from 'react';
import type { AttendanceView } from '../../../domains/Attendance';
import { selectRaffleWinner } from '../raffle';
import styles from './RafflePanel.module.css';

export interface RafflePanelProps {
  items: AttendanceView[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => Promise<AttendanceView[]>;
}

export const RafflePanel: React.FC<RafflePanelProps> = ({
  items,
  loading,
  refreshing,
  onRefresh,
}) => {
  const [drawing, setDrawing] = useState<boolean>(false);
  const [winner, setWinner] = useState<AttendanceView | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const isDrawingRef = useRef<boolean>(false);

  const eligibleItems = items.filter((item) => item.status === 'CONFIRMED');

  const handleDraw = async () => {
    if (isDrawingRef.current || drawing || loading || refreshing) return;

    isDrawingRef.current = true;
    setErrorMessage(null);
    setDrawing(true);
    setWinner(null);

    try {
      // Atualiza lista via API antes do sorteio
      const updatedItems = await onRefresh();
      const updatedEligible = updatedItems.filter((item) => item.status === 'CONFIRMED');

      if (updatedEligible.length === 0) {
        setDrawing(false);
        isDrawingRef.current = false;
        return;
      }

      // Sorteia o vencedor a partir da lista atualizada
      const selected = selectRaffleWinner(updatedEligible);

      // Suspense de 2 segundos (2000ms)
      timerRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        setWinner(selected);
        setDrawing(false);
        isDrawingRef.current = false;
      }, 2000);
    } catch {
      if (!isMountedRef.current) return;
      setErrorMessage('Falha ao atualizar participantes antes do sorteio. Tente novamente.');
      setDrawing(false);
      isDrawingRef.current = false;
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <section className={styles.panel} aria-labelledby="raffle-panel-title">
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h2 id="raffle-panel-title" className={styles.title}>
            Sorteio de Brindes
          </h2>
          <span className={styles.badgeCount}>
            {eligibleItems.length} {eligibleItems.length === 1 ? 'elegível' : 'elegíveis'}
          </span>
        </div>

        <button
          type="button"
          className={styles.drawButton}
          onClick={handleDraw}
          disabled={drawing || loading || refreshing || eligibleItems.length === 0}
          aria-busy={drawing}
        >
          {drawing ? 'Sorteando...' : 'Realizar Sorteio'}
        </button>
      </div>

      {errorMessage && (
        <div className={styles.emptyWarning} role="alert">
          {errorMessage}
        </div>
      )}

      {eligibleItems.length === 0 && !drawing && (
        <div className={styles.emptyWarning} role="status">
          Nenhum participante com presença confirmada (check-out realizado) para participar do sorteio.
        </div>
      )}

      {drawing && (
        <div className={styles.drawingState} aria-live="polite">
          <span>🎲 Sorteando entre os participantes com presença confirmada...</span>
        </div>
      )}

      {winner && !drawing && (
        <div className={styles.winnerCard} aria-live="assertive" role="region" aria-label="Resultado do sorteio">
          <div className={styles.winnerHeader}>
            <h3 className={styles.winnerTitle}>🎉 Vencedor(a) Sorteado(a)!</h3>
          </div>
          <div className={styles.winnerDetails}>
            <div>
              <div className={styles.fieldLabel}>Nome</div>
              <div className={styles.fieldValue}>{winner.studentName}</div>
            </div>
            <div>
              <div className={styles.fieldLabel}>RA</div>
              <div className={styles.fieldValue}>{winner.studentRa}</div>
            </div>
            <div>
              <div className={styles.fieldLabel}>Curso</div>
              <div className={styles.fieldValue}>{winner.studentCourse}</div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
