import { useEffect, useRef, useState } from "react";
import { openManagementPdf } from "../../../api/event/publicEventService";
import { apiRequest } from "../../../api/config/apiRequest";
import type { EventView } from "../../../domains/Event";
import {
  formatEventDate,
  formatEventTime,
} from "../../../utils/eventPresentation";
import { participantFileTemplate } from "./participantFileTemplates";
import { useParticipantDraft } from "./useParticipantDraft";
import { exportDraft, type DraftRow } from "./participantDraftStore";
import { readParticipantDraftFile } from "./participantDraftFile";
import { useManualCertificateBatch } from "./useManualCertificateBatch";
import CertificateBatchProgress from "./CertificateBatchProgress";
import { pdfLabels, deliveryLabels } from "./certificateProcessingLabels";
import StudentLookup, { type Candidate } from "./StudentLookup";
import RegularizationDialog from "./RegularizationDialog";
import { ClipboardList, Users, CheckCircle2, Settings2, CalendarDays, Wifi, WifiOff, ChevronDown } from 'lucide-react';
import MessageModal from "../../../components/messageModal/MessageModal";
import { LoadingComp } from "../../../components/loading/LoadingComp";
import "./regularization.css";
const selectableStatuses = new Set(['READY', 'ERROR', 'OUTCOME_UNKNOWN', 'IN_FLIGHT']);
const labels: Record<string, string> = {
  DRAFT: "Aguardando conferência",
  READY: "Localizado e elegível",
  REVIEW: "Revisão necessária",
  AMBIGUOUS: "Mais de um cadastro",
  NOT_FOUND: "Nome não encontrado",
  INELIGIBLE: "Inativo ou e-mail inválido",
  DUPLICATE: "Cadastro repetido",
  IN_FLIGHT: "Aguardando resposta do servidor",
  OUTCOME_UNKNOWN: "Resultado ainda não confirmado",
  DONE: "Participação registrada",
  ERROR: "Falha ao registrar",
  BLOCKED: "Requer atendimento administrativo",
};
type Analyzed = {
  row: number;
  status: string;
  ra?: string;
  accountId?: string;
  officialName?: string;
};
const normalize = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
function download(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function ParticipantFilePanel({
  event,
  onUpdated,
  mode = "notes",
}: {
  event: EventView;
  onUpdated: () => void;
  mode?: "notes" | "file";
}) {
  const store = useParticipantDraft(event);
  const { draft, change, error: storageError, saving } = store;
  const batch = useManualCertificateBatch(
    event.id,
    store.current,
    change,
    store.tabId,
    onUpdated,
  );
  const [expanded, setExpanded] = useState<{ rowId: string; panel: 'details' | 'actions' } | null>(null);
  const [clock, setClock] = useState(Date.now());
  const [notes, setNotes] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [connected, setConnected] = useState(navigator.onLine),
    [filter, setFilter] = useState("all"),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(0),
    [review, setReview] = useState<string | null>(null),
    [candidate, setCandidate] = useState<Candidate | null>(null),
    [clear, setClear] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!notes.trim()) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [notes]);
  const { pause, refresh } = batch;
  const hasDone = !!draft?.rows.some((row) => row.status === "DONE");
  const alive = useRef(true),
    analyzing = useRef(false),
    controller = useRef<AbortController | null>(null);
  useEffect(() => {
    alive.current = true;
    const online = () => {
        setConnected(true);
        setNotice(
          "Conexão de rede detectada. Confira os cadastros antes de emitir.",
        );
      },
      offline = () => {
        setConnected(false);
        pause();
      };
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      alive.current = false;
      controller.current?.abort();
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, [pause]);
  const run = async (action: () => Promise<unknown>) => {
    setError("");
    try {
      await action();
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "Não foi possível concluir.");
    }
  };
  useEffect(() => {
    if (!hasDone) return;
    const abort = new AbortController();
    const start = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    let delay = 5000;
    const tick = async () => {
      if (abort.signal.aborted) return;
      if (Date.now() - start > 120000) {
        setNotice(
          "O servidor continua processando. Use Atualizar situação para consultar novamente.",
        );
        return;
      }
      if (document.visibilityState !== "hidden" && !batch.busy) {
        try {
          await refresh(
            AbortSignal.any([abort.signal, AbortSignal.timeout(20000)]),
          );
          delay = 5000;
        } catch {
          delay = Math.min(delay * 2, 30000);
        }
      }
      if (!abort.signal.aborted) timer = setTimeout(() => void tick(), delay);
    };
    timer = setTimeout(() => void tick(), delay);
    return () => {
      abort.abort();
      clearTimeout(timer);
    };
  }, [event.id, hasDone, batch.busy, refresh]);
  if (!draft)
    return <p role="status">Preparando lista local… {storageError}</p>;
  const otherLease =
    !!draft.lease &&
    draft.lease.owner !== store.tabId &&
    draft.lease.until > clock;
  const locked = busy || batch.busy || saving || otherLease;
  const eventBlocked=['CANCELLED','SCHEDULED'].includes(event.status)||event.certificateEnabled===false;
  const editable = (row: DraftRow) => !row.operationId;
  const patch = (rowId: string, update: Partial<DraftRow>) =>
    change((old) => ({
      ...old,
      rows: old.rows.map((row) =>
        row.rowId === rowId ? { ...row, ...update } : row,
      ),
    }));
  const add = async () => {
    const names = notes
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter(Boolean);
    if (
      !names.length ||
      names.some((name) => name.length < 3 || name.length > 160)
    )
      throw new Error(
        "Informe nomes completos, um por linha, com 3 a 160 caracteres.",
      );
    if (draft.rows.length + names.length > 1000)
      throw new Error("Limite de 1.000 nomes por lista.");
    await change((old) => ({
      ...old,
      rows: [
        ...old.rows,
        ...names.map((rawName) => ({
          rowId: crypto.randomUUID(),
          rawName,
          status: "DRAFT",
        })),
      ],
    }));
    setNotes("");
    setConfirmed(false);
  };
  const analyze = async () => {
    if (analyzing.current) return;
    analyzing.current = true;
    setBusy(true);
    setConfirmed(false);
    setError("");
    controller.current = new AbortController();
    try {
      const latest = store.current()!;
      const pending = latest.rows.filter((row) => !row.operationId);
      if (!pending.length) return;
      const payload = exportDraft({ ...latest, rows: pending }, "json");
      const body = new FormData();
      body.append(
        "file",
        new File([payload], "participantes.json", { type: "application/json" }),
      );
      const response = await apiRequest<{ items: Analyzed[] }>(
        `/event-management/events/${event.id}/participant-file`,
        {
          method: "POST",
          body,
          signal: AbortSignal.any([
            controller.current.signal,
            AbortSignal.timeout(30000),
          ]),
        },
      );
      if (!alive.current) return;
      await change((old) => ({
        ...old,
        rows: old.rows.map((row) => {
          const index = pending.findIndex((item) => item.rowId === row.rowId);
          if (index < 0) return row;
          const found = response.items[index];
          if (!found) throw new Error("Resposta de análise incompleta.");
          return {
            ...row,
            status: row.review ? "REVIEW" : found.status,
            ra: found.ra,
            accountId: found.accountId,
            officialName: found.officialName,
            selected: false,
            error: undefined,
          };
        }),
      }));
      setConnected(true);
      setNotice(
        "Cadastros conferidos. Revise os nomes e selecione quem participou.",
      );
    } catch (e) {
      if (alive.current)
        setError(
          e instanceof Error
            ? e.message
            : "Falha ao conferir. A lista local foi preservada.",
        );
    } finally {
      analyzing.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const importFile = async (file: File) => {
    setBusy(true);
    try {
      const normalizeName = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim().replace(/\s+/g, ' ');
      const existingNames = new Set(draft.rows.map(row => normalizeName(row.rawName)));
      const imported = (await readParticipantDraftFile(file, event)).filter(row => !existingNames.has(normalizeName(row.rawName)));
      if (draft.rows.length + imported.length > 1000)
        throw new Error("Limite de 1.000 nomes.");
      await change((old) => ({
        ...old,
        rows: [
          ...old.rows,
          ...imported.map((row) => ({
            ...row,
            rowId: crypto.randomUUID(),
            status: "DRAFT",
          })),
        ],
      }));
      setConfirmed(false);
      setNotice("Arquivo salvo como rascunho. Ainda não houve emissão.");
    } finally {
      setBusy(false);
    }
  };
  const reviewed = (selected: Candidate) => {
    if (!review) return;
    void run(async () => {
      if (!["ativo", "em curso"].includes(selected.status.trim().toLowerCase()))
        throw new Error("Aluno inativo. Confira o cadastro antes de emitir.");
      await patch(review, {
        accountId: selected.accountId,
        ra: selected.ra,
        officialName: selected.name,
        status: "READY",
        selected: false,
        review: false,
      });
      setReview(null);
      setCandidate(null);
      setConfirmed(false);
    });
  };
  const counts = new Map<string, number>();
  for (const row of draft.rows)
    counts.set(
      normalize(row.rawName),
      (counts.get(normalize(row.rawName)) ?? 0) + 1,
    );
  const repeated = draft.rows.some(
    (row) => (counts.get(normalize(row.rawName)) ?? 0) > 1,
  );
  const selected = draft.rows.filter(
    (row) =>
      row.selected &&
      selectableStatuses.has(row.status),
  );
  const duplicateAccounts =
    new Set(selected.map((row) => row.accountId)).size !== selected.length;
  const filtered = draft.rows.filter(
    (row) =>
      normalize(`${row.rawName} ${row.officialName ?? ""}`).includes(normalize(query)) && (filter === "all" ||
      (filter === "review"
        ? !["READY", "DONE"].includes(row.status)
        : row.status === filter)),
  );
  const selectableFiltered = filtered.filter(row => selectableStatuses.has(row.status));
  const allFilteredSelected = selectableFiltered.length > 0 && selectableFiltered.every(row => row.selected);
  const someFilteredSelected = selectableFiltered.some(row => row.selected);
  const toggleFiltered = () => {
    if (locked) return;
    const ids = new Set(selectableFiltered.map(row => row.rowId));
    setConfirmed(false);
    void run(() => change(old => ({ ...old, rows: old.rows.map(row => ids.has(row.rowId) && selectableStatuses.has(row.status) ? { ...row, selected: !allFilteredSelected } : row) })));
  };
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / 25) - 1));
  const shown = filtered.slice(currentPage * 25, currentPage * 25 + 25);
  return (
    <div className="regularization-workspace">
      <div className="regularization-event">
        <CalendarDays size={20} aria-hidden="true" /><div><span className="regularization-eyebrow">Evento de destino</span><strong>{event.title}</strong>
        <span>
          {formatEventDate(event.startsAt)} às {formatEventTime(event.startsAt)}{" "}
          · Brasília
        </span></div>
        <span role="status" className={`regularization-network ${!connected ? 'regularization-network--offline' : ''}`}>
          {connected ? <Wifi size={15} aria-hidden="true" /> : <WifiOff size={15} aria-hidden="true" />}
          {connected
            ? "Rede disponível; a API será conferida ao consultar."
            : "Sem conexão. Continue anotando nomes."}
        </span>
      </div>
      <ol className="regularization-steps" aria-label="Etapas da regularização">
        <li><span>1</span><div><strong>Preparar lista</strong><small>Anote ou importe os nomes</small></div></li>
        <li><span>2</span><div><strong>Conferir cadastros</strong><small>Revise e selecione os alunos</small></div></li>
        <li><span>3</span><div><strong>Confirmar e acompanhar</strong><small>Registre a participação e o envio</small></div></li>
      </ol>
      <p role="status" className="regularization-save-status">
        {notes.trim()
          ? "Texto ainda não adicionado. Use Adicionar à lista para salvar estes nomes."
          : otherLease
            ? "Outra aba está processando esta lista. Aguarde e recarregue a versão salva."
            : saving
              ? "Salvando neste aparelho…"
              : storageError
                ? "Lista ainda não salva. Exporte uma cópia."
                : draft.updatedAt
                  ? `Salvo neste aparelho às ${new Date(draft.updatedAt).toLocaleTimeString("pt-BR")}`
                  : "Preparando armazenamento…"}
      </p>
      {(storageError || error || batch.error) && (
        <div role="alert" className="regularization-error">
          {storageError || error || batch.error}
          {storageError && (
            <button
              type="button"
              disabled={locked}
              onClick={() => void run(store.reload)}
            >
              Recarregar versão salva
            </button>
          )}
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      <fieldset disabled={locked} className="regularization-prepare">
        <legend>
          {mode === "notes"
            ? "Anotar participantes sem internet"
            : "Importar lista de participantes"}
        </legend>
        {mode === "notes" ? (
          <>
            <label htmlFor="participant-notes">
              Nomes completos, um por linha
            </label>
            <textarea
              id="participant-notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Digite um nome ou cole vários nomes"
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  notes.trim() &&
                  !notes.includes("\n")
                ) {
                  e.preventDefault();
                  void run(add);
                }
              }}
            />
            <button
              type="button"
              className="regularization-primary"
              disabled={!notes.trim()}
              onClick={() => void run(add)}
            >
              Adicionar à lista
            </button>
            <p>
              Enter adiciona um nome. Shift + Enter cria outra linha. Nenhuma
              consulta ao banco acontece ao anotar.
            </p>
          </>
        ) : (
          <>
            <div className="regularization-actions">
              {(["json", "csv"] as const).map((format) => (
                <button
                  type="button"
                  key={format}
                  onClick={() =>
                    download(
                      participantFileTemplate(event, format),
                      `modelo-${event.id}.${format}`,
                      format === "json" ? "application/json" : "text/csv",
                    )
                  }
                >
                  Baixar modelo {format.toUpperCase()}
                </button>
              ))}
            </div>
            <label>
              Arquivo de participantes
              <input
                type="file"
                accept=".json,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void run(() => importFile(file));
                  e.target.value = "";
                }}
              />
            </label>
            <p>
              JSON ou CSV UTF-8, até 2 MB e 1.000 nomes. Confirme o evento
              acima: CSV não inclui o destino.
            </p>
          </>
        )}
      </fieldset>
      <div className="regularization-toolbar">
        <button type="button" disabled={locked || eventBlocked || !draft.rows.length || !!storageError}
          className="regularization-primary" onClick={() => void analyze()}><Users size={18} aria-hidden="true" />Conferir cadastros</button>
        <details className="regularization-utilities"><summary><Settings2 size={17} aria-hidden="true" />Opções da lista e cópias</summary><div className="regularization-utility-content"><div className="regularization-actions">
        <button
          type="button"
          disabled={busy || batch.busy || saving}
          onClick={() => void run(store.reload)}
        >
          Recarregar lista salva
        </button>
        {(["json", "csv"] as const).map((format) => (
          <button
            key={format}
            type="button"
            disabled={!draft.rows.length}
            onClick={() =>
              download(
                exportDraft(draft, format),
                `participantes-${event.id}-${new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date(event.startsAt))}.${format}`,
                format === "json" ? "application/json" : "text/csv",
              )
            }
          >
            Exportar cópia {format.toUpperCase()}
          </button>
        ))}
        <button
          type="button"
          disabled={
            locked ||
            !draft.rows.length ||
            draft.rows.some((row) =>
              ["IN_FLIGHT", "OUTCOME_UNKNOWN"].includes(row.status),
            )
          }
          onClick={() => setClear(true)}
          className="regularization-danger"
        >
          Limpar lista local
        </button>
      </div>
      <button
        type="button"
        onClick={() =>
          void run(async () => {
            const persisted = await navigator.storage?.persist?.();
            setNotice(
              persisted
                ? "Armazenamento persistente concedido. Mantenha uma cópia exportada."
                : "O navegador não concedeu persistência. Exporte uma cópia para evitar perda de dados.",
            );
          })
        }
      >
        Solicitar armazenamento persistente
      </button>
      {draft.updatedAt &&
        Date.now() - Date.parse(draft.updatedAt) > 7 * 86400000 && (
          <p>
            Este rascunho tem mais de sete dias. Confira o prazo do evento e
            exporte uma cópia antes de limpar.
          </p>
        )}
      <p>
        As cópias exportadas contêm nomes. Guarde em local confiável. Abra este
        evento com internet antes da atividade; o navegador pode remover dados
        locais.
      </p>
      </div></details></div>
      {busy && (
        <div role="status">
          <LoadingComp />
          Conferindo cadastros ou preparando arquivo. Nenhum certificado está
          sendo emitido.
        </div>
      )}
      {repeated && (
        <p role="status">
          Há nomes repetidos. Confira se são homônimos antes de remover ou
          selecionar.
        </p>
      )}
      <section className="regularization-list-section" aria-label="Lista para regularização">
      <div className="regularization-section-heading"><span className="regularization-section-icon"><ClipboardList size={21} aria-hidden="true" /></span><div><h3>Lista de participantes · {draft.rows.length}</h3><p>Confira as situações e selecione os cadastros que deseja regularizar.</p></div></div>
      {!!draft.rows.length && <div className="regularization-metrics">
        <div><strong>{draft.rows.filter(row => row.status === 'READY').length}</strong><span>Localizados</span></div>
        <div><strong>{draft.rows.filter(row => !['READY', 'DONE'].includes(row.status)).length}</strong><span>Para conferir</span></div>
        <div><strong>{selected.length}</strong><span>Selecionados</span></div>
        <div><strong>{draft.rows.filter(row => row.status === 'DONE').length}</strong><span>Registrados</span></div>
      </div>}
      <div className="participant-list-tools">
      <label>
        Buscar por nome
        <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} placeholder="Nome anotado ou do cadastro" />
      </label>
      <label>
        Filtrar lista
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
          }}
        >
          <option value="all">Todos</option>
          <option value="READY">Localizados</option>
          <option value="review">Precisam de revisão</option>
          <option value="NOT_FOUND">Não encontrados</option>
          <option value="DONE">Registrados</option>
        </select>
      </label>
      </div>
      {!!draft.rows.length && <div className="participant-selection-toolbar">
        <label className="regularization-check">
          <input type="checkbox" checked={allFilteredSelected} disabled={locked || !selectableFiltered.length}
            ref={node => { if (node) node.indeterminate = someFilteredSelected && !allFilteredSelected; }} onChange={toggleFiltered} />
          Selecionar todos os disponíveis no filtro
        </label>
        <span>{selectableFiltered.length} disponível(is) · inclui todas as páginas do filtro</span>
      </div>}
      <p role="status" className="participant-list-count">{filtered.length} de {draft.rows.length} participante(s) · {selected.length} selecionado(s) na lista completa</p>
      {!!draft.rows.length && !filtered.length && <p className="participant-list-empty">Nenhum participante corresponde à busca e ao filtro. Ajuste os critérios para continuar.</p>}
      {!draft.rows.length && (
        <div className="participant-list-empty"><Users size={30} aria-hidden="true" /><strong>Sua lista começa aqui</strong><p>Nenhum nome anotado. Comece acima; a busca será feita depois.</p></div>
      )}
      <ul className="regularization-rows">
        {shown.map((row) => (
          <li key={row.rowId}>
            <div className="participant-row-primary">
              {selectableStatuses.has(row.status) && (
                <label className="regularization-check">
                  <input
                    type="checkbox"
                    disabled={locked}
                    checked={!!row.selected}
                    onChange={(e) => {
                      setConfirmed(false);
                      void run(() =>
                        patch(row.rowId, { selected: e.target.checked }),
                      );
                    }}
                  />
                  <span className="participant-visually-hidden">Selecionar {row.rawName}</span>
                </label>
              )}
            <div className="participant-row-identity">
              <strong>{row.rawName}</strong>
              {row.sourceEventId && <span>Nome reaproveitado de outra palestra · confirme participação neste evento.</span>}
              {row.sourceType === "visitante" && <span>Visitante na origem · confira individualmente antes de vincular a uma conta de aluno.</span>}
              <span className={`participant-row-status participant-row-status--${row.status.toLowerCase()}`}>{labels[row.status] ?? row.status}</span>
            </div>
            </div>
            <div className="participant-row-secondary" onKeyDown={e => { if (e.key === 'Escape' && expanded?.rowId === row.rowId) { setExpanded(null); document.getElementById(`row-${expanded.panel}-${row.rowId}`)?.focus(); } }}>
              <button type="button" className="participant-row-details" id={`row-details-${row.rowId}`}
                aria-expanded={expanded?.rowId === row.rowId && expanded.panel === 'details'} aria-controls={`row-panel-${row.rowId}`}
                onClick={() => setExpanded(current => current?.rowId === row.rowId && current.panel === 'details' ? null : { rowId: row.rowId, panel: 'details' })}>
                Detalhes<span className="participant-visually-hidden"> de {row.rawName}</span><ChevronDown size={15} aria-hidden="true" />
              </button>
              {(editable(row) || (row.status === 'ERROR' && !!row.operationId) || (row.status === 'DONE' && row.artifactState === 'READY' && !!row.certificateId)) &&
                <button type="button" className="participant-row-menu" id={`row-actions-${row.rowId}`}
                  aria-expanded={expanded?.rowId === row.rowId && expanded.panel === 'actions'} aria-controls={`row-panel-${row.rowId}`}
                  onClick={() => setExpanded(current => current?.rowId === row.rowId && current.panel === 'actions' ? null : { rowId: row.rowId, panel: 'actions' })}>
                  Ações<span className="participant-visually-hidden"> de {row.rawName}</span><ChevronDown size={15} aria-hidden="true" />
                </button>}
            </div>
            {expanded?.rowId === row.rowId && <div className="participant-row-expansion" id={`row-panel-${row.rowId}`} role="region"
              aria-labelledby={`row-${expanded.panel}-${row.rowId}`}
              onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setExpanded(null); document.getElementById(`row-${expanded.panel}-${row.rowId}`)?.focus(); } }}>
            {expanded.panel === 'details' ? <div className="participant-row-detail-content">
              {!row.officialName && !row.error && row.status !== "DONE" && <p>Cadastro ainda não vinculado. Use as ações para conferir ou corrigir este nome.</p> }
              {row.officialName && (
                <p>
                  Cadastro: {row.officialName} · RA {row.ra}
                </p>
              )}
              {row.error && <p className="regularization-error">{row.error}</p>}
              {row.status === "DONE" && (
                <p>
                  {pdfLabels[row.artifactState ?? ""] ?? "Consultando PDF"} ·{" "}
                  {deliveryLabels[row.deliveryState ?? ""] ??
                    "Consultando envio"}
                </p>
              )}
            </div> : <div className="regularization-actions">
              {row.status === "DONE" &&
                row.artifactState === "READY" &&
                row.certificateId && (
                  <button
                    type="button"
                    onClick={() =>
                      void run(() =>
                        openManagementPdf(
                          `certificates/${row.certificateId}/pdf`,
                        ),
                      )
                    }
                  >
                    Baixar certificado
                  </button>
                )}
              {row.status === "ERROR" && row.operationId && <button type="button" disabled={locked} onClick={()=>void run(async()=>{
                setBusy(true);try{
                  const result=await apiRequest<{items:{known:boolean}[]}>(`/event-management/events/${event.id}/manual-certificate-operations/status`,{method:'POST',body:JSON.stringify({operationIds:[row.operationId]}),signal:AbortSignal.timeout(20000)});
                  if(result.items[0]?.known===true){await batch.refresh();return;}if(result.items[0]?.known!==false)throw new Error('Não foi possível confirmar o resultado. Preserve a chave e tente consultar novamente.');
                  await patch(row.rowId,{status:'DRAFT',operationId:undefined,payload:undefined,accountId:undefined,ra:undefined,officialName:undefined,selected:false,error:undefined});setConfirmed(false);
                }finally{setBusy(false)}
              })}>Rever cadastro após falha</button>}
              {editable(row) && (
                <>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => {
                      setReview(row.rowId);
                      setCandidate(null);
                      setError('');
                    }}
                  >
                    Conferir cadastro
                  </button>
                  <details>
                    <summary>Corrigir nome anotado</summary>
                    <label>
                      Nome anotado
                      <input
                        disabled={locked}
                        defaultValue={row.rawName}
                        maxLength={160}
                        onBlur={(e) => {
                          const rawName = e.target.value.trim();
                          if (rawName === row.rawName) return;
                          if (rawName.length < 3) {
                            setError(
                              "Nome deve ter pelo menos três caracteres.",
                            );
                            return;
                          }
                          setConfirmed(false);
                          void run(() =>
                            patch(row.rowId, {
                              rawName,
                              status: "DRAFT",
                              accountId: undefined,
                              ra: undefined,
                              officialName: undefined,
                              selected: false,
                            }),
                          );
                        }}
                      />
                    </label>
                  </details>
                  <button
                    type="button"
                    disabled={locked}
                    className="regularization-danger"
                    onClick={() => {
                      setConfirmed(false);
                      void run(() =>
                        change((old) => ({
                          ...old,
                          rows: old.rows.filter(
                            (item) => item.rowId !== row.rowId,
                          ),
                        })),
                      );
                    }}
                  >
                    Remover da lista
                  </button>
                </>
              )}
            </div>}
            </div>}
          </li>
        ))}
      </ul>
      {filtered.length > 25 && (
        <div className="regularization-actions">
          <button
            type="button"
            disabled={!currentPage}
            onClick={() => setPage(currentPage - 1)}
          >
            Página anterior
          </button>
          <span>
            Página {currentPage + 1} de {Math.ceil(filtered.length / 25)}
          </span>
          <button
            type="button"
            disabled={(currentPage + 1) * 25 >= filtered.length}
            onClick={() => setPage(currentPage + 1)}
          >
            Próxima página
          </button>
        </div>
      )}
      {review && (
        <RegularizationDialog title="Conferência de cadastro" description={`Confira o cadastro de ${draft.rows.find((row) => row.rowId === review)?.rawName}. Selecione a conta que corresponde à pessoa da lista.`} onClose={() => setReview(null)}>
          {error && <p role="alert" className="regularization-error">{error}</p>}
          <StudentLookup
            inline
            key={review}
            initialQuery={
              draft.rows.find((row) => row.rowId === review)?.rawName
            }
            onSelect={setCandidate}
          />
          <div className="regularization-dialog-footer">
            <button
              type="button"
              disabled={!candidate || locked}
              className="regularization-primary"
              onClick={() => candidate && reviewed(candidate)}
            >
              Usar este cadastro
            </button>
            <button type="button" onClick={() => setReview(null)}>
              Fechar conferência
            </button>
          </div>
        </RegularizationDialog>
      )}
      </section>
      {!!draft.rows.length && <fieldset className="regularization-confirmation" disabled={busy || batch.busy || otherLease || !!storageError}>
        <legend>Confirmar participações</legend>
        <p>
          Destino: {event.title} · {formatEventDate(event.startsAt)} às{" "}
          {formatEventTime(event.startsAt)}. {selected.length} selecionado(s).
        </p>
        <label>
          Justificativa do lote
          <textarea
            maxLength={900}
            minLength={10}
            value={draft.reason}
            onChange={(e) => {
              setConfirmed(false);
              const reason = e.target.value;
              void run(() => change((old) => ({ ...old, reason })));
            }}
          />
        </label>
        <label className="regularization-check">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          Conferi os cadastros e confirmo que participaram deste evento, nesta
          data e horário.
        </label>
        {duplicateAccounts && (
          <p role="alert">
            O mesmo cadastro foi selecionado mais de uma vez. Desmarque a
            duplicata.
          </p>
        )}
        <button
          type="button"
          className="regularization-primary"
          disabled={
            saving ||
            eventBlocked ||
            !confirmed ||
            draft.reason.trim().length < 10 ||
            !selected.length ||
            duplicateAccounts
          }
          onClick={() => {
            setConfirmed(false);
            void batch.run(true);
          }}
        >
          <CheckCircle2 size={18} aria-hidden="true" />Registrar participações e emitir {selected.length} certificado(s)
        </button>
      </fieldset>}
      {(batch.message || draft.rows.some((row) => row.operationId)) && (
        <>
          <CertificateBatchProgress
            rows={draft.rows}
            busy={batch.busy}
            message={batch.message}
            onPause={batch.pause}
          />
          <button
            type="button"
            disabled={locked}
            onClick={() => void run(() => batch.refresh())}
          >
            Atualizar situação
          </button>
          <p>
            Para retomar, selecione as pendências e confirme novamente. A chave
            salva consulta o resultado antes de repetir a operação.
          </p>
        </>
      )}
      <MessageModal
        visible={clear}
        title="Limpar lista local?"
        message="Confirme que exportou uma cópia. Isso remove apenas o rascunho deste aparelho; participações e certificados existentes são preservados."
        tone="warning"
        confirmText="Limpar lista"
        cancelText="Voltar"
        onCancel={() => setClear(false)}
        onConfirm={() => {
          setClear(false);
          void run(() => change((old) => ({ ...old, rows: [], reason: "" })));
        }}
      />
    </div>
  );
}
