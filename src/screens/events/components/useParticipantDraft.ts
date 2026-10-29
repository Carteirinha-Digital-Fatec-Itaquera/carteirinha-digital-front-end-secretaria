import { useCallback, useEffect, useRef, useState } from "react";
import { inspectSessionToken, onSessionClear } from "../../../api/auth/session";
import { useSecretarySession } from "../../../api/auth/useSecretarySession";
import type { EventView } from "../../../domains/Event";
import {
  draftKey,
  loadDraft,
  saveDraft,
  type ParticipantDraft,
} from "./participantDraftStore";
export function useParticipantDraft(event: EventView) {
  const session = useSecretarySession();
  const owner = Number(inspectSessionToken(session.token)?.payload.sub);
  const tab = useRef(crypto.randomUUID()),
    value = useRef<ParticipantDraft | null>(null),
    active = useRef(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve()),
    writes = useRef(0);
  const [draft, setDraft] = useState<ParticipantDraft | null>(null),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const generation = useRef(0);
  const fresh = useCallback(
    (): ParticipantDraft => ({
      schemaVersion: 1,
      draftId: draftKey(owner, event.id),
      ownerSecretaryId: owner,
      eventId: event.id,
      eventSnapshot: {
        title: event.title,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
      },
      revision: 0,
      updatedAt: "",
      rows: [],
      reason: "",
    }),
    [owner, event.id, event.title, event.startsAt, event.endsAt],
  );
  const reload = useCallback(async () => {
    if (!Number.isSafeInteger(owner) || owner < 1)
      throw new Error("Entre novamente para acessar sua lista.");
    const stamp = ++generation.current;
    const old = await loadDraft(draftKey(owner, event.id));
    if (!active.current || stamp !== generation.current) return;
    const next = old ?? (await saveDraft(fresh(), 0, tab.current));
    if (!active.current || stamp !== generation.current) return;
    const recovered =
      !next.lease || next.lease.until <= Date.now()
        ? {
            ...next,
            lease: undefined,
            rows: next.rows.map((row) =>
              row.status === "IN_FLIGHT"
                ? { ...row, status: "OUTCOME_UNKNOWN" }
                : row,
            ),
          }
        : next;
    value.current = recovered;
    setDraft(recovered);
    setError("");
  }, [owner, event.id, fresh]);
  useEffect(() => {
    const epoch = generation;
    let mounted = true;
    active.current = true;
    const off = onSessionClear(() => {
      active.current = false;
      value.current = null;
      setDraft(null);
    });
    void reload().catch((e) => {
      if (!mounted || !active.current) return;
      if (Number.isSafeInteger(owner) && owner > 0) {
        value.current = fresh();
        setDraft(value.current);
      }
      setError(
        e instanceof Error
          ? e.message
          : "Armazenamento indisponível. Exporte antes de sair.",
      );
    });
    return () => {
      mounted = false;
      active.current = false;
      epoch.current++;
      off();
    };
  }, [reload, owner, fresh]);
  const change = useCallback(
    (
      update: (old: ParticipantDraft) => ParticipantDraft,
    ): Promise<ParticipantDraft> => {
      writes.current++;
      setSaving(true);
      const operation = queue.current
        .catch(() => undefined)
        .then(async () => {
          if (!value.current || !active.current)
            throw new Error("Sessão ou rascunho indisponível.");
          const previous = value.current,
            next = update(previous);
          value.current = next;
          setDraft(next);
          try {
            const saved = await saveDraft(next, previous.revision, tab.current);
            if (!active.current) throw new Error("Sessão encerrada.");
            value.current = saved;
            setDraft(saved);
            setError("");
            return saved;
          } catch (e) {
            if (active.current)
              setError(
                e instanceof Error
                  ? e.message
                  : "Falha ao salvar neste aparelho.",
              );
            throw e;
          }
        })
        .finally(() => {
          writes.current--;
          if (active.current) setSaving(writes.current > 0);
        });
      queue.current = operation;
      return operation;
    },
    [],
  );
  const current = useCallback(() => value.current, []);
  return { draft, change, error, saving, tabId: tab.current, reload, current };
}
