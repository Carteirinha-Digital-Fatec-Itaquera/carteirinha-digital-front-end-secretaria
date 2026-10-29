export type DraftRow = {
  rowId: string;
  rawName: string;
  sourceType?: string;
  sourceEventId?: string;
  status: string;
  review?: boolean;
  ra?: string;
  accountId?: string;
  officialName?: string;
  selected?: boolean;
  operationId?: string;
  payload?: Record<string, unknown>;
  certificateId?: string;
  artifactState?: string;
  deliveryState?: string;
  error?: string;
};
export type ParticipantDraft = {
  schemaVersion: 1;
  draftId: string;
  ownerSecretaryId: number;
  eventId: string;
  eventSnapshot: { title: string; startsAt: string; endsAt: string };
  revision: number;
  updatedAt: string;
  rows: DraftRow[];
  reason: string;
  lease?: { owner: string; until: number };
};
let database: Promise<IDBDatabase> | undefined;
function open() {
  if (!database)
    database = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("event-participant-drafts", 1);
      req.onupgradeneeded = () =>
        req.result.createObjectStore("drafts", { keyPath: "draftId" });
      req.onsuccess = () => {
        req.result.onversionchange = () => {
          req.result.close();
          database = undefined;
        };
        resolve(req.result);
      };
      req.onerror = () => {
        database = undefined;
        reject(req.error);
      };
      req.onblocked = () => {
        database = undefined;
        reject(new Error("Feche outras abas para preparar o armazenamento."));
      };
    });
  return database;
}
export const draftKey = (owner: number, eventId: string) =>
  `${owner}:${eventId}`;
export async function loadDraft(key: string): Promise<ParticipantDraft | null> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("drafts", "readonly");
    const request = tx.objectStore("drafts").get(key);
    tx.oncomplete = () => {
      const value = request.result as ParticipantDraft | undefined;
      if (
        value &&
        (value.schemaVersion !== 1 ||
          value.draftId !== key ||
          draftKey(value.ownerSecretaryId, value.eventId) !== key ||
          !Array.isArray(value.rows) ||
          value.rows.length > 1000 ||
          !Number.isSafeInteger(value.revision) ||
          value.rows.some(
            (row) =>
              typeof row.rowId !== "string" ||
              typeof row.rawName !== "string" ||
              row.rawName.length > 160 ||
              typeof row.status !== "string",
          ))
      )
        return reject(
          new Error(
            "Rascunho incompatível. Preserve uma cópia antes de continuar.",
          ),
        );
      resolve(value ?? null);
    };
    tx.onerror = () => reject(tx.error);
  });
}
export async function saveDraft(
  value: ParticipantDraft,
  expectedRevision: number,
  tabId: string,
): Promise<ParticipantDraft> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("drafts", "readwrite");
    const store = tx.objectStore("drafts");
    const get = store.get(value.draftId);
    let failure: Error | undefined;
    let saved: ParticipantDraft;
    get.onsuccess = () => {
      const current = get.result as ParticipantDraft | undefined;
      if (
        (current?.revision ?? 0) !== expectedRevision ||
        (current?.lease &&
          current.lease.until > Date.now() &&
          current.lease.owner !== tabId)
      ) {
        failure = new Error(
          "Outra aba alterou ou está processando esta lista. Atualize antes de continuar.",
        );
        tx.abort();
        return;
      }
      saved = {
        ...value,
        revision: expectedRevision + 1,
        updatedAt: new Date().toISOString(),
      };
      store.put(saved);
    };
    tx.oncomplete = () => resolve(saved);
    tx.onabort = () =>
      reject(
        failure ??
          tx.error ??
          new Error("Não foi possível salvar neste aparelho."),
      );
    tx.onerror = () => reject(tx.error);
  });
}
export function exportDraft(draft: ParticipantDraft, format: "json" | "csv") {
  const names = draft.rows.map((row) => row.rawName);
  if (format === "csv" && draft.rows.some(row => row.sourceType || row.review || row.sourceEventId)) {
    const cell = (value: string) => '"' + (/^[=+@-]/.test(value) ? "'" + value : value).replace(/"/g, '""') + '"';
    return "\uFEFFnome_transcrito,tipo_participante,status,origem_evento_id\r\n" + draft.rows.map(row => [row.rawName, row.sourceType || 'aluno', row.review ? 'revisar' : '', row.sourceEventId || ''].map(cell).join(',')).join('\r\n');
  }
  if (format === "csv")
    return (
      "\uFEFFnome_transcrito\r\n" +
      names
        .map(
          (name) =>
            '"' +
            (/^[=+\-@\t\r]/.test(name) ? "'" + name : name).replace(
              /"/g,
              '""',
            ) +
            '"',
        )
        .join("\r\n")
    );
  return JSON.stringify(
    {
      versao_formato: "1.0",
      evento: {
        id_evento_banco: draft.eventId,
        titulo: draft.eventSnapshot.title,
        data: new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Sao_Paulo",
        }).format(new Date(draft.eventSnapshot.startsAt)),
        horario_inicio: new Intl.DateTimeFormat("pt-BR", {
          timeZone: "America/Sao_Paulo",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).format(new Date(draft.eventSnapshot.startsAt)),
      },
      participantes: draft.rows.map(row => ({ nome_transcrito: row.rawName, ...(row.sourceType ? { tipo_participante: row.sourceType } : {}), ...(row.sourceEventId ? { origem_evento_id: row.sourceEventId } : {}), ...(row.review ? { status: "revisar" } : {}) })),
    },
    null,
    2,
  );
}
