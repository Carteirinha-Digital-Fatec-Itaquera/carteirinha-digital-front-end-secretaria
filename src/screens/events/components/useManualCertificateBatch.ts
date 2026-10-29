import { useCallback, useEffect, useRef, useState } from "react";
import { management } from "../../../api/event/publicEventService";
import {
  getSessionSnapshot,
  isCurrentSession,
  onSessionClear,
} from "../../../api/auth/session";
import { ApiRequestError } from "../../../api/config/apiRequest";
import type { ParticipantDraft, DraftRow } from "./participantDraftStore";
type Change = (
  update: (draft: ParticipantDraft) => ParticipantDraft,
) => Promise<ParticipantDraft>;
export type OperationResult = {
  operationId: string;
  known: boolean;
  certificateId?: string;
  artifactState?: string;
  deliveryState?: string;
  revoked?: boolean;
  eventCancelled?: boolean;
};
export function useManualCertificateBatch(
  eventId: string,
  current: () => ParticipantDraft | null,
  change: Change,
  tabId: string,
  onUpdated: () => void,
) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const stop = useRef(false),
    lock = useRef(false),
    controller = useRef<AbortController | null>(null);
  useEffect(() => {
    const off = onSessionClear(() => {
      stop.current = true;
      controller.current?.abort();
    });
    return () => {
      stop.current = true;
      controller.current?.abort();
      off();
    };
  }, []);
  const resultRow = (row: DraftRow, result: OperationResult): DraftRow => ({
    ...row,
    status: result.revoked || result.eventCancelled ? "BLOCKED" : "DONE",
    certificateId: result.certificateId,
    artifactState: result.artifactState,
    deliveryState: result.deliveryState,
    error: result.revoked
      ? "Certificado revogado. Consulte a reemissão autorizada."
      : result.eventCancelled
        ? "Evento cancelado após o registro."
        : undefined,
  });
  const status = useCallback(
    async (ids: string[], signal: AbortSignal) => {
      const items: OperationResult[] = [];
      for (let offset = 0; offset < ids.length; offset += 100) {
        const response = await management<{ items: OperationResult[] }>(
          `events/${eventId}/manual-certificate-operations/status`,
          { operationIds: ids.slice(offset, offset + 100) },
          "POST",
          signal,
        );
        items.push(...response.items);
      }
      return items;
    },
    [eventId],
  );
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      const rows =
        current()?.rows.filter(
          (row) =>
            row.operationId &&
            ["DONE", "OUTCOME_UNKNOWN", "IN_FLIGHT", "BLOCKED"].includes(
              row.status,
            ),
        ) ?? [];
      if (!rows.length) return;
      const results = await status(
        rows.map((row) => row.operationId!),
        signal ?? AbortSignal.timeout(20000),
      );
      await change((draft) => ({
        ...draft,
        rows: draft.rows.map((row) => {
          const found = results.find(
            (item) => item.operationId === row.operationId,
          );
          return found?.known ? resultRow(row, found) : row;
        }),
      }));
    },
    [current, status, change],
  );
  async function run(confirmed: boolean) {
    if (
      lock.current ||
      !confirmed ||
      (current()?.reason.trim().length ?? 0) < 10
    )
      return;
    lock.current = true;
    stop.current = false;
    setBusy(true);
    setError("");
    setMessage("Preparando o lote…");
    const session = getSessionSnapshot();
    const valid = () => !stop.current && isCurrentSession(session);
    const updateRow = (id: string, update: Partial<DraftRow>) =>
      change((draft) => ({
        ...draft,
        lease: { owner: tabId, until: Date.now() + 45000 },
        rows: draft.rows.map((row) =>
          row.rowId === id ? { ...row, ...update } : row,
        ),
      }));
    try {
      await change((draft) => ({
        ...draft,
        lease: { owner: tabId, until: Date.now() + 45000 },
      }));
      const rows = current()!.rows.filter(
        (row) =>
          row.selected &&
          ["READY", "ERROR", "IN_FLIGHT", "OUTCOME_UNKNOWN"].includes(
            row.status,
          ),
      );
      for (const original of rows) {
        if (!valid()) break;
        let row = current()!.rows.find(
          (item) => item.rowId === original.rowId,
        )!;
        controller.current = new AbortController();
        const signal = AbortSignal.any([
          controller.current.signal,
          AbortSignal.timeout(20000),
        ]);
        try {
          if (row.operationId) {
            const [known] = await status([row.operationId], signal);
            if (!valid()) break;
            if (known.known) {
              await updateRow(row.rowId, resultRow(row, known));
              continue;
            }
          }
          if (!row.accountId || !row.ra)
            throw new ApiRequestError(
              400,
              "Confira e selecione o cadastro novamente.",
            );
          const requestId = row.operationId ?? crypto.randomUUID();
          const payload = row.payload ?? {
            requestId,
            identityType: "STUDENT",
            ra: row.ra,
            expectedAccountId: row.accountId,
            participationConfirmed: true,
            reason: current()!.reason.trim(),
          };
          await updateRow(row.rowId, {
            operationId: requestId,
            payload,
            status: "IN_FLIGHT",
            error: undefined,
          });
          if (!valid()) break;
          row = current()!.rows.find((item) => item.rowId === row.rowId)!;
          setMessage(
            `Registrando ${row.rawName}. Aguarde a confirmação do servidor.`,
          );
          const result = await management<OperationResult>(
            `events/${eventId}/manual-certificates`,
            payload,
            "POST",
            signal,
          );
          if (!valid()) break;
          await updateRow(
            row.rowId,
            resultRow(row, { ...result, known: true, operationId: requestId }),
          );
        } catch (failure) {
          if (!isCurrentSession(session)) break;
          const definite =
            failure instanceof ApiRequestError &&
            [400, 404, 409, 422].includes(failure.status);
          const reason =
            failure instanceof Error ? failure.message : "Falha de conexão.";
          await updateRow(row.rowId, {
            status: definite ? "ERROR" : "OUTCOME_UNKNOWN",
            error: reason,
          });
          if (
            !definite ||
            (failure instanceof ApiRequestError &&
              [404, 409].includes(failure.status))
          ) {
            setError(
              "Processamento pausado. Confira a conexão e retome para consultar o resultado antes de reenviar.",
            );
            break;
          }
        }
      }
      if (isCurrentSession(session)) {
        setMessage(
          stop.current
            ? "Pausado após o registro atual."
            : "Etapa de registros finalizada. Confira as pendências e o processamento de PDF/e-mail.",
        );
        onUpdated();
      }
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível salvar o progresso. Exporte a lista.",
      );
    } finally {
      if (isCurrentSession(session) && current()?.lease?.owner === tabId) {
        try {
          await change((draft) => ({ ...draft, lease: undefined }));
        } catch {
          /* The lease expires; the persisted operation key remains authoritative. */
        }
      }
      lock.current = false;
      setBusy(false);
    }
  }
  const pause = useCallback(() => {
    stop.current = true;
    setMessage("Pausa solicitada. Aguardando a operação atual.");
  }, []);
  return { run, refresh, busy, message, error, pause };
}
