import {
  ArrowLeft,
  ArrowRight,
  Inbox,
  Search,
  SlidersHorizontal,
  MessageSquare,
  UserRound,
} from "lucide-react";
import MessageModal from "../../components/messageModal/MessageModal";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import MenuLateral from "../../components/menuLateral/MenuLateral";
import { apiRequest } from "../../api/config/apiRequest";
import layout from "../../styles/layoutWithMenu.module.css";
import "./support.css";
const auditLabels: Record<string, string> = {
  CREATED: 'Solicitação criada', MESSAGE: 'Mensagem enviada', CLAIM: 'Atendimento assumido',
  ASSIGNEE: 'Responsável alterado', STATUS: 'Situação atualizada', CLOSE: 'Atendimento encerrado',
  REOPEN: 'Atendimento reaberto', REDACT: 'Conteúdo sensível removido', CANCEL: 'Solicitação cancelada', DELETE: 'Solicitação excluída',
};
const statuses: Record<string, string> = {
  OPEN: "Aberto",
  IN_PROGRESS: "Em atendimento",
  WAITING_STUDENT: "Aguardando aluno",
  RESOLVED: "Resolvido",
  CLOSED: "Encerrado",
};
const categories: Record<string, string> = {
  DATA: "Dados cadastrais",
  PHOTO_CARD: "Foto ou carteirinha",
  EVENT: "Presença em evento",
  CERTIFICATE: "Certificado",
  ACCESS: "Acesso à conta",
  OTHER: "Outro problema",
};
type Ticket = {
  closeReason?: string | null;
  id: string;
  protocol: string;
  subject: string;
  category: string;
  status: string;
  version: number;
  unread: boolean;
  studentName: string | null;
  studentRa: string | null;
  assignedSecretaryId: number | null;
  assigneeName: string | null;
  createdAt: string;
  updatedAt?: string;
  studentCourse?: string | null;
  eventId: string | null;
  certificateId: string | null;
  requestedField?: string;
  proposedValue?: string;
};
type Message = {
  id: string;
  authorRole: string;
  body: string;
  redactedAt: string | null;
  createdAt: string;
};
type Detail = {
  ticket: Ticket;
  messages: Message[];
  messageNextCursor: string | null;
  viewerSecretaryId: number;
};
type Page = { items: Ticket[]; nextCursor: string | null };
type Audit = {
  id: string;
  action: string;
  actorRole: string;
  actorIdentity: string;
  createdAt: string;
  reason: string | null;
  resultReference: string | null;
};
const date = (value: string) =>
  new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
const request = <T,>(
  path: string,
  body?: object,
  method = "POST",
  signal?: AbortSignal,
) =>
  apiRequest<T>(
    "/support/admin" + path,
    body ? { method, body: JSON.stringify(body), signal } : { signal },
  );
export default function SupportScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const applied = searchParams.toString();
  const listUrl = "/suporte" + (applied ? "?" + applied : "");
  const [loading, setLoading] = useState(true);
  const [redactReason, setRedactReason] = useState("");
  const submitting = useRef(false);
  const [dangerAction, setDangerAction] = useState<"cancel" | "delete" | null>(
    null,
  );
  const [actionReason, setActionReason] = useState("");
  const [page, setPage] = useState<Page>({ items: [], nextCursor: null });
  const [detail, setDetail] = useState<Detail | null>(null);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [assignees, setAssignees] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [filters, setFilters] = useState(() => ({
    q: searchParams.get("q") || "",
    status: searchParams.get("status") || "",
    category: searchParams.get("category") || "",
    assignee: searchParams.get("assignee") || "all",
    from: searchParams.get("from") || "",
    to: searchParams.get("to") || "",
  }));

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [assignee, setAssignee] = useState("");
  const [redactId, setRedactId] = useState("");
  const actionKey = useRef<{ payload: string; id: string } | null>(null);
  const epoch = useRef(0);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const current = ++epoch.current;
      setError("");
      try {
        if (id) {
          const [value, history, people] = await Promise.all([
            request<Detail>("/tickets/" + id, undefined, undefined, signal),
            request<Audit[]>(
              "/tickets/" + id + "/audit",
              undefined,
              undefined,
              signal,
            ),
            request<{ id: number; name: string }[]>(
              "/assignees",
              undefined,
              undefined,
              signal,
            ),
          ]);
          if (signal?.aborted || current !== epoch.current) return;
          setDetail(value);
          setAudit(history);
          setAssignees(people);
          await request(
            "/tickets/" + id + "/read",
            { version: value.ticket.version },
            undefined,
            signal,
          );
          window.dispatchEvent(new Event("support:updated"));
        } else {
          const value = await request<Page>(
            "/tickets?" + applied,
            undefined,
            undefined,
            signal,
          );
          if (!signal?.aborted && current === epoch.current) setPage(value);
        }
      } catch (e) {
        if (!signal?.aborted && current === epoch.current)
          setError(
            e instanceof Error ? e.message : "Falha ao carregar atendimento.",
          );
      } finally {
        if (!signal?.aborted && current === epoch.current) setLoading(false);
      }
    },
    [id, applied],
  );
  useEffect(() => {
    const counter = epoch;
    const controller = new AbortController();
    const refresh = () => {
      if (document.visibilityState !== "hidden") void load(controller.signal);
    };
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setLoading(true);
      const params = new URLSearchParams(applied);
      setFilters({
        q: params.get("q") || "",
        status: params.get("status") || "",
        category: params.get("category") || "",
        assignee: params.get("assignee") || "all",
        from: params.get("from") || "",
        to: params.get("to") || "",
      });
      setDetail(null);
      setMessage("");
      setReason("");
      setRedactReason("");
      setRedactId("");
      setActionReason("");
      setAssignee("");
      setReference("");
      setConfirmed(false);
      actionKey.current = null;
      refresh();
    });
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      counter.current++;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load, applied]);
  async function act(action: string, extra: object = {}, method = "POST") {
    if (!detail || !id || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    const data = {
      expectedVersion: detail.ticket.version,
      ...(["messages", "status"].includes(action) && message.trim()
        ? { message: message.trim() }
        : {}),
      ...(action === "assignee" && reason.trim()
        ? { reason: reason.trim() }
        : {}),
      ...(action.endsWith("/redact") ? { reason: redactReason.trim() } : {}),
      ...(["messages", "status"].includes(action) && reference.trim()
        ? { resultReference: reference.trim() }
        : {}),
      ...extra,
    };
    const payload = JSON.stringify([action, data]);
    if (!actionKey.current || actionKey.current.payload !== payload)
      actionKey.current = { payload, id: crypto.randomUUID() };
    try {
      await request(
        "/tickets/" + id + "/" + action,
        { ...data, requestId: actionKey.current.id },
        method,
      );
      actionKey.current = null;
      if (["messages", "status"].includes(action)) {
        setMessage("");
        setReference("");
        setConfirmed(false);
      }
      setReason("");
      setRedactReason("");
      setRedactId("");
      setActionReason("");
      setSuccess(
        action === "messages"
          ? "Resposta enviada ao aluno."
          : "Atendimento atualizado com sucesso.",
      );
      if (action === "delete") {
        window.dispatchEvent(new Event("support:updated"));
        navigate(listUrl, { replace: true });
        return;
      }
      await load();
      window.dispatchEvent(new Event("support:updated"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar atendimento.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  async function more(messages = false) {
    setBusy(true);
    try {
      if (messages && detail) {
        const older = await request<Detail>(
          "/tickets/" + id + "?cursor=" + detail.messageNextCursor,
        );
        setDetail({
          ...detail,
          messages: [...older.messages, ...detail.messages],
          messageNextCursor: older.messageNextCursor,
        });
      } else {
        const next = await request<Page>(
          "/tickets?" + applied + "&cursor=" + page.nextCursor,
        );
        setPage({
          items: [...page.items, ...next.items],
          nextCursor: next.nextCursor,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar.");
    } finally {
      setBusy(false);
    }
  }
  const terminal =
    detail && ["RESOLVED", "CLOSED"].includes(detail.ticket.status);
  const responsible =
    detail && detail.ticket.assignedSecretaryId === detail.viewerSecretaryId;
  const hasFilters = Object.entries(filters).some(
    ([key, value]) => value && !(key === "assignee" && value === "all"),
  );
  const statusLabel = (ticket: Ticket) =>
    ticket.closeReason?.startsWith("CANCELLED_")
      ? "Cancelado"
      : statuses[ticket.status] || ticket.status;
  return (
    <div className={layout.layoutContainer}>
      <div className={layout.menuWrapper}>
        <MenuLateral />
      </div>
      <main className="secretary-support" aria-busy={busy || loading}>
        <div className="support-container">
          <header className="support-page-header">
            {id && (
              <Link className="support-back" to={listUrl}>
                <ArrowLeft size={18} aria-hidden="true" />
                Voltar à fila
              </Link>
            )}
            <p className="support-eyebrow">
              <MessageSquare size={18} aria-hidden="true" />
              ATENDIMENTO AO ALUNO
            </p>
            <h1>{id ? "Detalhes da solicitação" : "Suporte aos alunos"}</h1>
            <p>
              {id
                ? "Acompanhe a conversa e conduza o atendimento."
                : "Organize as solicitações e acompanhe o que precisa de atenção."}
            </p>
          </header>
          {error && (
            <div role="alert" className="support-error">
              <span>{error}</span>
              <button disabled={busy} onClick={() => void load()}>
                Atualizar atendimento
              </button>
            </div>
          )}
          {busy && (
            <p role="status" className="support-progress">
              Processando… Aguarde a conclusão.
            </p>
          )}
          {!id && (
            <>
              <form
                className="support-filter-panel"
                onSubmit={(e) => {
                  e.preventDefault();
                  const query = new URLSearchParams(
                    Object.entries(filters).filter(
                      ([key, value]) =>
                        value && !(key === "assignee" && value === "all"),
                    ),
                  );
                  if (query.toString() === applied) void load();
                  else {
                    setLoading(true);
                    setSearchParams(query);
                  }
                }}
              >
                <div className="support-search-row">
                  <label>
                    Nome, RA, protocolo ou assunto
                    <span className="support-search-input">
                      <Search size={18} aria-hidden="true" />
                      <input
                        value={filters.q}
                        maxLength={120}
                        placeholder="Busque uma solicitação ou aluno"
                        onChange={(e) =>
                          setFilters({ ...filters, q: e.target.value })
                        }
                      />
                    </span>
                  </label>
                  <button className="support-primary" disabled={busy}>
                    Buscar solicitações
                  </button>
                </div>
                <details
                  className="support-filters"
                  open={hasFilters || undefined}
                >
                  <summary>
                    <SlidersHorizontal size={16} aria-hidden="true" />
                    Filtros de atendimento
                  </summary>
                  <div className="support-filter-grid">
                    <label>
                      Situação
                      <select
                        value={filters.status}
                        onChange={(e) =>
                          setFilters({ ...filters, status: e.target.value })
                        }
                      >
                        <option value="">Todas</option>
                        {Object.entries(statuses).map(([value, label]) => (
                          <option value={value} key={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Categoria
                      <select
                        value={filters.category}
                        onChange={(e) =>
                          setFilters({ ...filters, category: e.target.value })
                        }
                      >
                        <option value="">Todas</option>
                        {Object.entries(categories).map(([value, label]) => (
                          <option value={value} key={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Responsável
                      <select
                        value={filters.assignee}
                        onChange={(e) =>
                          setFilters({ ...filters, assignee: e.target.value })
                        }
                      >
                        <option value="all">Todos</option>
                        <option value="mine">Meus atendimentos</option>
                        <option value="unassigned">Sem responsável</option>
                      </select>
                    </label>
                    <label>
                      Desde
                      <input
                        type="date"
                        value={filters.from}
                        onChange={(e) =>
                          setFilters({ ...filters, from: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Até
                      <input
                        type="date"
                        min={filters.from || undefined}
                        value={filters.to}
                        onChange={(e) =>
                          setFilters({ ...filters, to: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  <div className="support-tools">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setFilters({
                          q: "",
                          status: "",
                          category: "",
                          assignee: "all",
                          from: "",
                          to: "",
                        });
                        setSearchParams({});
                      }}
                    >
                      Limpar filtros
                    </button>
                  </div>
                </details>
              </form>
              <section
                className="support-queue"
                aria-label="Fila de solicitações"
              >
                <div className="support-queue-heading">
                  <h2>Fila de solicitações</h2>
                  <span>Mais antigas primeiro</span>
                </div>
                <p className="support-muted">
                  Solicitações aguardando o aluno não entram no contador de
                  pendências do menu.
                </p>
                {loading && (
                  <div role="status" className="support-empty">
                    Carregando solicitações…
                  </div>
                )}
                {!loading && !error && !page.items.length && (
                  <div className="support-empty">
                    <Inbox size={36} aria-hidden="true" />
                    <h3>
                      {applied
                        ? "Nenhuma solicitação encontrada"
                        : "Nenhuma solicitação recebida"}
                    </h3>
                    <p>
                      {applied
                        ? "Revise os filtros para ampliar sua busca."
                        : "As solicitações enviadas pelos alunos aparecerão aqui."}
                    </p>
                  </div>
                )}
                {!loading && (
                  <ul className="support-ticket-list">
                    {page.items.map((ticket) => (
                      <li key={ticket.id}>
                        <Link
                          className="support-ticket"
                          to={
                            "/suporte/" +
                            ticket.id +
                            (applied ? "?" + applied : "")
                          }
                        >
                          <div className="support-ticket-top">
                            <span
                              className={
                                "support-badge status-" + ticket.status
                              }
                            >
                              {statusLabel(ticket)}
                            </span>
                            {ticket.unread && (
                              <span className="support-unread">
                                Nova atualização
                              </span>
                            )}
                            <span className="support-protocol">
                              {ticket.protocol}
                            </span>
                          </div>
                          <h3>{ticket.subject}</h3>
                          <p className="support-student">
                            <UserRound size={16} aria-hidden="true" />
                            {ticket.studentName || "Conta removida"}
                            <span>RA {ticket.studentRa || "indisponível"}</span>
                          </p>
                          <div className="support-ticket-meta">
                            <span>{categories[ticket.category]}</span>
                            <span>
                              {ticket.assigneeName || "Sem responsável"}
                            </span>
                            <span>
                              Aberta em{" "}
                              <time dateTime={ticket.createdAt}>
                                {date(ticket.createdAt)}
                              </time>
                            </span>
                            {ticket.updatedAt && (
                              <span>
                                Atualizada em{" "}
                                <time dateTime={ticket.updatedAt}>
                                  {date(ticket.updatedAt)}
                                </time>
                              </span>
                            )}
                          </div>
                          <span className="support-ticket-action">
                            Ver atendimento{" "}
                            <ArrowRight size={16} aria-hidden="true" />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {!loading && page.nextCursor && (
                  <button disabled={busy} onClick={() => void more()}>
                    Carregar mais solicitações
                  </button>
                )}
              </section>
            </>
          )}
          {id && !detail && !error && (
            <p role="status" className="support-empty">
              Carregando atendimento…
            </p>
          )}
          {detail && (
            <>
              <header className="support-case-header">
                <div className="support-ticket-top">
                  <span
                    className={"support-badge status-" + detail.ticket.status}
                  >
                    {statusLabel(detail.ticket)}
                  </span>
                  <span className="support-protocol">
                    {detail.ticket.protocol}
                  </span>
                </div>
                <h2>{detail.ticket.subject}</h2>
                <p className="support-student">
                  <UserRound size={16} aria-hidden="true" />
                  {detail.ticket.studentName || "Conta removida"}
                </p>
                <div className="support-ticket-meta">
                  <span>{categories[detail.ticket.category]}</span>
                  <span>
                    Aberta em{" "}
                    <time dateTime={detail.ticket.createdAt}>
                      {date(detail.ticket.createdAt)}
                    </time>
                  </span>
                  {detail.ticket.updatedAt && (
                    <span>
                      Atualizada em{" "}
                      <time dateTime={detail.ticket.updatedAt}>
                        {date(detail.ticket.updatedAt)}
                      </time>
                    </span>
                  )}
                </div>
              </header>
              <div className="support-workspace">
                <div className="support-main-column">
                  <section
                    className="support-panel support-thread"
                    aria-label="Conversa"
                  >
                    <h2>Conversa com o aluno</h2>
                    <p className="support-muted">
                      Descrição da solicitação e mensagens do atendimento.
                    </p>
                    {detail.messageNextCursor && (
                      <button disabled={busy} onClick={() => void more(true)}>
                        Mensagens anteriores
                      </button>
                    )}
                    <ol className="support-conversation">
                      {detail.messages.map((item) => (
                        <li
                          className={
                            item.authorRole === "STUDENT"
                              ? "support-message-student"
                              : "support-message-secretary"
                          }
                          key={item.id}
                        >
                          <div className="support-message-heading">
                            <strong>
                              {item.authorRole === "STUDENT"
                                ? "Aluno"
                                : "Secretaria"}
                            </strong>
                            <time dateTime={item.createdAt}>
                              {date(item.createdAt)}
                            </time>
                          </div>
                          <p>{item.body}</p>
                          {responsible && !item.redactedAt && (
                            <details className="support-message-options">
                              <summary>Opções da mensagem</summary>
                              <button
                                disabled={busy}
                                onClick={() => {
                                  setRedactId(item.id);
                                  setRedactReason("");
                                }}
                              >
                                Remover conteúdo sensível desta mensagem
                              </button>
                            </details>
                          )}
                        </li>
                      ))}
                    </ol>
                    {redactId && (
                      <section
                        className="support-sensitive"
                        aria-label="Remoção de conteúdo sensível"
                      >
                        <h3>Remover conteúdo sensível</h3>
                        <p>
                          A remoção é permanente. A auditoria preserva autor e
                          data, sem copiar o conteúdo removido.
                        </p>
                        <label>
                          Justificativa
                          <textarea
                            disabled={busy}
                            minLength={3}
                            maxLength={1000}
                            value={redactReason}
                            onChange={(e) => setRedactReason(e.target.value)}
                          />
                        </label>
                        <div className="support-tools">
                          <button
                            disabled={busy || redactReason.trim().length < 3}
                            onClick={() =>
                              void act("messages/" + redactId + "/redact")
                            }
                          >
                            Confirmar remoção do conteúdo
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => setRedactId("")}
                          >
                            Cancelar remoção
                          </button>
                        </div>
                      </section>
                    )}
                    {!terminal && responsible && (
                      <section
                        className="support-reply"
                        aria-label="Responder ao aluno"
                      >
                        <label>
                          Resposta ao aluno
                          <textarea
                            disabled={busy}
                            value={message}
                            maxLength={3000}
                            placeholder="Escreva a orientação ou resposta para o aluno…"
                            onChange={(e) => setMessage(e.target.value)}
                          />
                        </label>
                        <details>
                          <summary>Adicionar referência da ação</summary>
                          <label>
                            Referência da ação realizada (opcional)
                            <input
                              disabled={busy}
                              value={reference}
                              maxLength={200}
                              onChange={(e) => setReference(e.target.value)}
                            />
                          </label>
                        </details>
                        <div className="support-tools">
                          <button
                            className="support-primary"
                            disabled={busy || !message.trim()}
                            onClick={() => void act("messages")}
                          >
                            Enviar resposta
                          </button>
                          {detail.ticket.status === "IN_PROGRESS" && (
                            <button
                              disabled={busy || !message.trim()}
                              onClick={() =>
                                void act("status", {
                                  status: "WAITING_STUDENT",
                                })
                              }
                            >
                              Solicitar informação ao aluno
                            </button>
                          )}
                          {detail.ticket.status === "WAITING_STUDENT" && (
                            <button
                              disabled={busy || !message.trim()}
                              onClick={() =>
                                void act("status", { status: "IN_PROGRESS" })
                              }
                            >
                              Retomar atendimento
                            </button>
                          )}
                        </div>
                        <div className="support-resolution">
                          <h3>Concluir atendimento</h3>
                          <p className="support-muted">
                            Use a resposta acima para explicar a solução ao
                            aluno.
                          </p>
                          <label className="support-check">
                            <input
                              disabled={busy}
                              type="checkbox"
                              checked={confirmed}
                              onChange={(e) => setConfirmed(e.target.checked)}
                            />
                            Confirmei a correção ou a orientação no fluxo
                            adequado.
                          </label>
                          <button
                            disabled={busy || !confirmed || !message.trim()}
                            onClick={() =>
                              void act("status", {
                                status: "RESOLVED",
                                confirmed,
                              })
                            }
                          >
                            Marcar como resolvido e avisar o aluno
                          </button>
                        </div>
                      </section>
                    )}
                    {terminal && (
                      <p className="support-muted">
                        Este atendimento está{" "}
                        {statusLabel(detail.ticket).toLowerCase()}. O histórico
                        permanece disponível para consulta.
                      </p>
                    )}
                  </section>
                  <details className="support-panel support-audit">
                    <summary>Histórico de auditoria</summary>
                    <ul>
                      {audit.map((item) => (
                        <li key={item.id}>
                          <strong>{auditLabels[item.action] || item.action}</strong>
                          <span>
                            {item.actorRole === "STUDENT"
                              ? "Aluno"
                              : "Secretaria"}{" "}
                            ·{" "}
                            <time dateTime={item.createdAt}>
                              {date(item.createdAt)}
                            </time>
                          </span>
                          {item.reason && <p>{item.reason}</p>}
                          {item.resultReference && (
                            <p>Referência: {item.resultReference}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                    {!audit.length && (
                      <p className="support-muted">
                        Nenhum registro disponível.
                      </p>
                    )}
                  </details>
                </div>
                <aside
                  className="support-side-column"
                  aria-label="Dados e gestão do atendimento"
                >
                  <section className="support-panel">
                    <h2>Aluno solicitante</h2>
                    <dl className="support-data">
                      <dt>RA</dt>
                      <dd>{detail.ticket.studentRa || "Indisponível"}</dd>
                      {detail.ticket.studentCourse && (
                        <>
                          <dt>Curso</dt>
                          <dd>{detail.ticket.studentCourse}</dd>
                        </>
                      )}
                    </dl>
                    {detail.ticket.requestedField && (
                      <p>
                        Informação a conferir:{" "}
                        {(
                          {
                            NAME: "Nome completo",
                            SOCIAL_NAME: "Nome social",
                            COURSE: "Curso",
                            EMAIL: "E-mail",
                            OTHER: "Outra informação",
                          } as Record<string, string>
                        )[detail.ticket.requestedField] ||
                          detail.ticket.requestedField}
                      </p>
                    )}
                    {detail.ticket.proposedValue && (
                      <div className="support-proposal">
                        <span>Informação proposta pelo aluno</span>
                        <p>{detail.ticket.proposedValue}</p>
                        <small>Confira antes de alterar o cadastro.</small>
                      </div>
                    )}
                    <nav
                      className="support-related"
                      aria-label="Ações relacionadas"
                    >
                      {detail.ticket.studentRa && (
                        <Link
                          to={
                            "/update/" +
                            encodeURIComponent(detail.ticket.studentRa)
                          }
                        >
                          Conferir cadastro do aluno{" "}
                          <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                      )}
                      {detail.ticket.category === "PHOTO_CARD" && (
                        <Link to="/fotos">Conferir fotos pendentes</Link>
                      )}
                      {detail.ticket.eventId && (
                        <Link
                          to={
                            "/eventos/" + detail.ticket.eventId + "/gerenciar"
                          }
                        >
                          Conferir evento e certificados
                        </Link>
                      )}
                    </nav>
                    {detail.ticket.certificateId && (
                      <details>
                        <summary>Certificado vinculado</summary>
                        <p>{detail.ticket.certificateId}</p>
                      </details>
                    )}
                  </section>
                  <section className="support-panel">
                    <h2>Responsável pelo atendimento</h2>
                    <p>{detail.ticket.assigneeName || "Não atribuído"}</p>
                    {!terminal && (
                      <>
                        {!detail.ticket.assignedSecretaryId && (
                          <button
                            className="support-primary"
                            disabled={busy}
                            onClick={() => void act("claim")}
                          >
                            Assumir atendimento
                          </button>
                        )}
                        {!responsible && (
                          <p className="support-muted">
                            As respostas ficam disponíveis para o responsável
                            pelo atendimento.
                          </p>
                        )}
                        <details>
                          <summary>Reatribuir atendimento</summary>
                          <label>
                            Novo responsável
                            <select
                              disabled={busy}
                              value={assignee}
                              onChange={(e) => setAssignee(e.target.value)}
                            >
                              <option value="">Selecione</option>
                              {assignees.map((person) => (
                                <option value={person.id} key={person.id}>
                                  {person.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Justificativa da reatribuição
                            <textarea
                              disabled={busy}
                              value={reason}
                              maxLength={1000}
                              onChange={(e) => setReason(e.target.value)}
                            />
                          </label>
                          <button
                            disabled={
                              busy || !assignee || reason.trim().length < 3
                            }
                            onClick={() =>
                              void act(
                                "assignee",
                                { assigneeId: Number(assignee) },
                                "PATCH",
                              )
                            }
                          >
                            Reatribuir com justificativa
                          </button>
                        </details>
                      </>
                    )}
                  </section>
                  <details className="support-panel support-other-actions">
                    <summary>Outras ações</summary>
                    <p className="support-muted">
                      Cancelamento e exclusão exigem justificativa e
                      confirmação.
                    </p>
                    <label>
                      Motivo para cancelar ou excluir
                      <input
                        disabled={busy}
                        minLength={3}
                        maxLength={1000}
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                      />
                    </label>
                    <div className="support-tools">
                      {!terminal && (
                        <button
                          disabled={busy || actionReason.trim().length < 3}
                          onClick={() => setDangerAction("cancel")}
                        >
                          Cancelar solicitação
                        </button>
                      )}
                      <button
                        disabled={busy || actionReason.trim().length < 3}
                        onClick={() => setDangerAction("delete")}
                      >
                        Excluir solicitação
                      </button>
                    </div>
                  </details>
                </aside>
              </div>
            </>
          )}
        </div>
      </main>
      <MessageModal
        visible={!!success}
        tone="success"
        title="Alteração salva"
        message={success}
        confirmText="Continuar"
        onConfirm={() => setSuccess("")}
        onDismiss={() => setSuccess("")}
      />
      <MessageModal
        visible={dangerAction !== null}
        tone="warning"
        title={
          dangerAction === "delete"
            ? "Excluir solicitação?"
            : "Cancelar solicitação?"
        }
        message={
          dangerAction === "delete"
            ? "A solicitação será retirada das listas do aluno e da Secretaria. O histórico será preservado para auditoria."
            : "O atendimento será encerrado como cancelado, sem marcar o problema como resolvido."
        }
        confirmText={
          dangerAction === "delete"
            ? "Confirmar exclusão"
            : "Confirmar cancelamento"
        }
        cancelText="Voltar"
        onCancel={() => setDangerAction(null)}
        onDismiss={() => setDangerAction(null)}
        onConfirm={() => {
          const action = dangerAction;
          setDangerAction(null);
          if (action && !busy)
            void act(action, { reason: actionReason.trim(), confirmed: true });
        }}
      />
    </div>
  );
}
