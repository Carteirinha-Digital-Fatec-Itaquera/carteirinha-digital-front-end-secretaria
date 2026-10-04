import { useCallback, useEffect, useRef, useState } from 'react';
import type { AttendanceSummary, AttendanceView } from '../../../domains/Attendance';
import { getAttendanceSummary, getEventAttendances } from '../../../api/attendance/attendanceService';
import { ApiRequestError } from '../../../api/config/apiRequest';

const POLLING_INTERVAL_MS = 15000;

export interface UseEventParticipantsResult {
  items: AttendanceView[];
  summary: AttendanceSummary | null;
  loading: boolean;
  refreshing: boolean;
  stale: boolean;
  error: string | null;
  lastUpdatedAt: Date | null;
  refresh(): Promise<AttendanceView[]>;
}

export function useEventParticipants(eventId: string): UseEventParticipantsResult {
  const [items, setItems] = useState<AttendanceView[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [stale, setStale] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const inFlightPromiseRef = useRef<Promise<AttendanceView[]> | null>(null);
  const hasSuccessfulFetchRef = useRef<boolean>(false);
  const executeFetchRef = useRef<(isManual: boolean) => Promise<AttendanceView[]>>(() => Promise.resolve([]));

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleNextPoll = useCallback(() => {
    clearTimer();
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return;
    }
    timerRef.current = setTimeout(() => {
      void executeFetchRef.current(false);
    }, POLLING_INTERVAL_MS);
  }, [clearTimer]);

  const executeFetch = useCallback(
    async (isManualRefresh: boolean): Promise<AttendanceView[]> => {
      // Se ja existe uma requisicao em andamento, retorna a promise em voo para evitar sobreposicao
      if (inFlightPromiseRef.current) {
        return inFlightPromiseRef.current;
      }

      clearTimer();

      if (!eventId) {
        setItems([]);
        setSummary(null);
        setLoading(false);
        return [];
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (!hasSuccessfulFetchRef.current) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const fetchPromise = (async (): Promise<AttendanceView[]> => {
        try {
          const [attendancesData, summaryData] = await Promise.all([
            getEventAttendances(eventId, { signal: controller.signal }),
            getAttendanceSummary(eventId, { signal: controller.signal }),
          ]);

          if (!isMountedRef.current || controller.signal.aborted) {
            return [];
          }

          setItems(attendancesData);
          setSummary(summaryData);
          setLastUpdatedAt(new Date());
          setStale(false);
          setError(null);
          hasSuccessfulFetchRef.current = true;

          return attendancesData;
        } catch (err: unknown) {
          if (!isMountedRef.current || controller.signal.aborted) {
            return [];
          }

          let errorMessage = 'Não foi possível carregar os dados de presença.';
          if (err instanceof ApiRequestError) {
            if (err.status === 401 || err.status === 403) {
              errorMessage = 'Sessão expirada ou sem permissão para acessar os dados deste evento.';
            } else if (err.message) {
              errorMessage = err.message;
            }
          } else if (err instanceof Error) {
            errorMessage = err.message;
          }

          setError(errorMessage);

          // Se ja houve leitura anterior bem-sucedida, preserva dados e marca stale
          if (hasSuccessfulFetchRef.current) {
            setStale(true);
          }

          // Se for refresh manual por acao (ex: antes do sorteio), relanca o erro para a UI tratar
          if (isManualRefresh) {
            throw err;
          }

          return [];
        } finally {
          if (isMountedRef.current && !controller.signal.aborted) {
            setLoading(false);
            setRefreshing(false);
            inFlightPromiseRef.current = null;
            scheduleNextPoll();
          }
        }
      })();

      inFlightPromiseRef.current = fetchPromise;
      return fetchPromise;
    },
    [clearTimer, eventId, scheduleNextPoll]
  );

  executeFetchRef.current = executeFetch;

  const refresh = useCallback((): Promise<AttendanceView[]> => {
    return executeFetch(true);
  }, [executeFetch]);

  // Efeito principal: mudanca de eventId ou montagem
  useEffect(() => {
    isMountedRef.current = true;
    hasSuccessfulFetchRef.current = false;
    setItems([]);
    setSummary(null);
    setError(null);
    setStale(false);
    setLastUpdatedAt(null);
    setRefreshing(false);

    void executeFetch(false);

    return () => {
      isMountedRef.current = false;
      clearTimer();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // O finally da consulta abortada não limpa estas referências. Libere-as
      // para a próxima montagem de efeitos (StrictMode) ou troca de evento.
      // A consulta antiga continua impedida de publicar dados pelo seu signal.
      abortControllerRef.current = null;
      inFlightPromiseRef.current = null;
    };
  }, [clearTimer, eventId, executeFetch]);

  // Listener para visibilitychange da aba
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'visible') {
        // Ao voltar para a aba, dispara sincronizacao
        void executeFetch(false);
      } else {
        // Aba em segundo plano: pausa o timer
        clearTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [clearTimer, executeFetch]);

  return {
    items,
    summary,
    loading,
    refreshing,
    stale,
    error,
    lastUpdatedAt,
    refresh,
  };
}
