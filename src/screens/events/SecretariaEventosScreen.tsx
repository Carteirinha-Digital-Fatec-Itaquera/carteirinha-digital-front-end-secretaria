import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Calendar,
  Clock,
  MapPin,
  User,
  AlertCircle,
  RefreshCw,
  Edit2,
  Ban,
  Trash2,
} from "lucide-react";

import MenuLateral from "../../components/menuLateral/MenuLateral";
import MessageModal from "../../components/messageModal/MessageModal";
import { getEvents, cancelEvent, deleteEvent } from "../../api/event/eventService";
import type { EventView } from "../../domains/Event";
import type { CheckpointType, CheckpointView } from "../../domains/Checkpoint";
import { formatEventDate, formatEventTime, formatWorkload } from "../../utils/eventPresentation";
import { CancelEventDialog } from "./components/CancelEventDialog";
import { DeleteEventDialog } from "./components/DeleteEventDialog";

import styles from "./style.module.css";
import layoutStyles from "../../styles/layoutWithMenu.module.css";

type CheckpointDisplayStatus = "open" | "closed" | "finished";
type EventTab = "active" | "completed" | "cancelled";

function eventTab(event: EventView, now: number): EventTab {
  if (event.status === "CANCELLED") return "cancelled";
  if (event.status === "COMPLETED" || Date.parse(event.endsAt) <= now) return "completed";
  return "active";
}

const statusLabel: Record<CheckpointDisplayStatus, string> = {
  open: "Aberto",
  closed: "Fechado",
  finished: "Encerrado",
};

function getCheckpointState(
  checkpoints: CheckpointView[] | undefined,
  type: CheckpointType
): CheckpointDisplayStatus {
  const cp = checkpoints?.find((c) => c.type === type);
  if (!cp) return "closed";
  if (cp.isOpen) return "open";
  if (cp.closedAt) return "finished";
  return "closed";
}

export default function SecretariaEventosScreen() {
  const navigate = useNavigate();

  const [events, setEvents] = useState<EventView[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<EventTab>("active");
  const [sortOrder, setSortOrder] = useState<"agenda" | "recent" | "oldest">("agenda");
  const [now, setNow] = useState(Date.now);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingEvent, setCancellingEvent] = useState<EventView | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<EventView | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  async function loadEvents() {
    try {
      setLoading(true);
      setError(null);
      const data = await getEvents();
      setEvents(data);
      setNow(Date.now());
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar a lista de eventos";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmCancel(reason: string) {
    if (!cancellingEvent) return;
    await cancelEvent(cancellingEvent.id, { reason });
    setActionSuccess(`Evento "${cancellingEvent.title}" cancelado com sucesso.`);
    setCancellingEvent(null);
    await loadEvents();
  }

  async function handleConfirmDelete() {
    if (!deletingEvent) return;
    await deleteEvent(deletingEvent.id);
    setActionSuccess(`Evento "${deletingEvent.title}" excluído com sucesso.`);
    setDeletingEvent(null);
    await loadEvents();
  }

  useEffect(() => {
    void loadEvents();
    // Keep a long-lived panel current, including after returning from slides.
    const updateClock = () => setNow(Date.now());
    const timer = window.setInterval(updateClock, 30_000);
    window.addEventListener("focus", updateClock);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", updateClock);
    };
  }, []);

  const counts = useMemo(() => {
    const totals = { active: 0, completed: 0, cancelled: 0 };
    for (const evt of events) {
      totals[eventTab(evt, now)]++;
    }
    return totals;
  }, [events, now]);

  const filteredEvents = useMemo(() => {
    const list = events.filter((event) => {
      // Filtro de aba: ativos, concluídos e cancelados.
      if (eventTab(event, now) !== activeTab) return false;

      const searchText = search.toLowerCase();
      const matchesSearch =
        event.title.toLowerCase().includes(searchText) ||
        event.speaker.toLowerCase().includes(searchText);

      if (!matchesSearch) return false;
      if (activeTab !== "active" || statusFilter === "all") return true;

      const checkInStatus = getCheckpointState(event.checkpoints, "CHECK_IN");
      const checkOutStatus = getCheckpointState(event.checkpoints, "CHECK_OUT");

      return checkInStatus === statusFilter || checkOutStatus === statusFilter;
    });

    // Agenda prioriza os eventos em andamento e depois o próximo início.
    list.sort((a, b) => {
      const timeA = new Date(a.startsAt).getTime();
      const timeB = new Date(b.startsAt).getTime();
      if (sortOrder === "agenda" && activeTab === "active") {
        const ongoingA = timeA <= now;
        const ongoingB = timeB <= now;
        if (ongoingA !== ongoingB) return ongoingA ? -1 : 1;
      }
      if (sortOrder === "recent" || (sortOrder === "agenda" && activeTab !== "active")) {
        if (timeB !== timeA) return timeB - timeA;
        return new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime();
      } else {
        if (timeA !== timeB) return timeA - timeB;
        return new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime();
      }
    });

    return list;
  }, [events, activeTab, search, statusFilter, sortOrder, now]);

  function getStatusClass(status: CheckpointDisplayStatus) {
    if (status === "open") return styles.statusOpen;
    if (status === "closed") return styles.statusClosed;
    return styles.statusFinished;
  }

  return (
    <div className={layoutStyles.layoutContainer}>
      <div className={layoutStyles.menuWrapper}>
        <MenuLateral />
      </div>

      <div className={layoutStyles.contentWrapper}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Gerenciar Eventos</h1>
              <p className={styles.subtitle}>
                Controle de presença, checkpoints e emissão de certificados
              </p>
            </div>

            <button
              className={styles.addBtn}
              onClick={() => navigate("/eventos/novo")}
              type="button"
            >
              <Plus size={18} />
              Novo Evento
            </button>
          </div>

          <div
            className={styles.tabsContainer}
            role="tablist"
            aria-label="Filtrar por tipo de evento"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "active"}
              className={`${styles.tabButton} ${
                activeTab === "active" ? styles.tabButtonActive : ""
              }`}
              onClick={() => setActiveTab("active")}
            >
              Eventos Ativos
              <span className={styles.tabCount}>{counts.active}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "completed"}
              className={`${styles.tabButton} ${activeTab === "completed" ? styles.tabButtonActive : ""}`}
              onClick={() => setActiveTab("completed")}
            >
              Eventos Concluídos
              <span className={styles.tabCount}>{counts.completed}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "cancelled"}
              className={`${styles.tabButton} ${
                activeTab === "cancelled" ? styles.tabButtonActive : ""
              }`}
              onClick={() => setActiveTab("cancelled")}
            >
              Eventos Cancelados
              <span
                className={`${styles.tabCount} ${styles.tabCountCancelled}`}
              >
                {counts.cancelled}
              </span>
            </button>
          </div>

          <p className={styles.subtitle}>
            Horário de Brasília (America/Sao_Paulo). Ativos: em andamento e próximos eventos.
            Concluídos: finalizados ou com término previsto já atingido; o gerenciamento permanece disponível.
          </p>

          <div className={styles.filterBar}>
            <div className={styles.searchArea}>
              <div className={styles.searchBox}>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Buscar por evento ou palestrante"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Buscar eventos"
                />
                <span className={styles.searchIcon}>
                  <Search size={18} />
                </span>
              </div>
            </div>

            <div className={styles.filterControls}>
              {activeTab === "active" && (
                <select
                  className={styles.filterSelect}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filtrar por status"
                >
                  <option value="all">Todos os status</option>
                  <option value="open">Checkpoints Abertos</option>
                  <option value="closed">Checkpoints Fechados</option>
                  <option value="finished">Checkpoints Encerrados</option>
                </select>
              )}

              <select
                className={styles.filterSelect}
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(e.target.value as "agenda" | "recent" | "oldest")
                }
                aria-label="Ordenar por data"
              >
                <option value="agenda">{activeTab === "active" ? "Em andamento e próximos primeiro" : "Mais recentes primeiro (padrão)"}</option>
                <option value="recent">Mais atuais primeiro</option>
                <option value="oldest">Mais antigos primeiro</option>
              </select>
            </div>
          </div>

          <div className={styles.list}>
            <div className={styles.listHeader}>
              <div>
                Total:{" "}
                <span className={styles.totalCount}>
                  {filteredEvents.length} evento(s)
                </span>
              </div>

              <button
                className={styles.refreshBtn}
                onClick={loadEvents}
                disabled={loading}
                type="button"
              >
                <RefreshCw size={14} className={loading ? styles.spinning : ""} />
                Atualizar
              </button>
            </div>

            {loading ? (
              <div className={styles.empty}>
                <p>Carregando eventos...</p>
              </div>
            ) : error ? (
              <div className={styles.empty}>
                <AlertCircle size={40} color="#e63946" />
                <h3>Falha ao carregar eventos</h3>
                <p>{error}</p>
                <button
                  className={styles.refreshBtn}
                  onClick={loadEvents}
                  type="button"
                  style={{ marginTop: "12px" }}
                >
                  Tentar novamente
                </button>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className={styles.empty}>
                <Calendar size={40} />
                <h3>
                  {activeTab === "cancelled"
                    ? "Nenhum evento cancelado"
                    : activeTab === "completed"
                    ? "Nenhum evento concluído encontrado"
                    : "Nenhum evento encontrado"}
                </h3>
                <p>
                  {activeTab === "cancelled"
                    ? "Não há eventos cancelados no momento."
                    : "Não encontramos eventos com os filtros selecionados."}
                </p>
              </div>
            ) : (
              <div className={styles.eventsList}>
                {filteredEvents.map((event) => {
                  const checkInState = getCheckpointState(event.checkpoints, "CHECK_IN");
                  const checkOutState = getCheckpointState(event.checkpoints, "CHECK_OUT");

                  return (
                    <div className={styles.eventCard} key={event.id}>
                      <div className={styles.eventHeader}>
                        <div>
                          <h2 className={styles.eventTitle}>{event.title}</h2>
                          <div className={styles.speaker}>
                            <User size={16} />
                            {event.speaker}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          {event.visitorsAllowed && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "3px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: 600,
                                backgroundColor: "#eff6ff",
                                color: "#1d4ed8",
                                border: "1px solid #bfdbfe",
                              }}
                              title="Permite participação de visitantes externos sem conta institucional"
                            >
                              Visitantes permitidos
                            </span>
                          )}
                          {event.status === "CANCELLED" && (
                            <span className={styles.badgeCancelled}>
                              <Ban size={13} />
                              Cancelado
                            </span>
                          )}
                        </div>
                      </div>

                      {event.status === "CANCELLED" && event.cancelReason && (
                        <div className={styles.cancelReasonBox}>
                          <strong>Motivo do cancelamento:</strong> {event.cancelReason}
                        </div>
                      )}

                      <div className={styles.eventMeta}>
                        <span>
                          <Calendar size={16} />
                          {formatEventDate(event.startsAt)}
                        </span>

                        <span>
                          <Clock size={16} />
                          {formatEventTime(event.startsAt)} - {formatEventTime(event.endsAt)}
                        </span>

                        <span>
                          <MapPin size={16} />
                          {event.location}
                        </span>

                        <span>
                          {formatWorkload(event.workloadMinutes)}
                        </span>
                      </div>

                      <div className={styles.checkpoints}>
                        <div className={styles.checkpoint}>
                          <span>Check-in</span>
                          <span className={`${styles.status} ${getStatusClass(checkInState)}`}>
                            {statusLabel[checkInState]}
                          </span>
                        </div>

                        <div className={styles.checkpoint}>
                          <span>Check-out</span>
                          <span className={`${styles.status} ${getStatusClass(checkOutState)}`}>
                            {statusLabel[checkOutState]}
                          </span>
                        </div>
                      </div>

                      <div className={styles.actions}>
                        {event.status !== "CANCELLED" && (
                          <>
                            <button
                              className={styles.editBtn}
                              onClick={() => navigate(`/eventos/${event.id}/editar`)}
                              type="button"
                              title="Editar evento"
                            >
                              <Edit2 size={15} />
                              Editar
                            </button>

                            <button
                              className={styles.cancelActionBtn}
                              onClick={() => setCancellingEvent(event)}
                              type="button"
                              title="Cancelar evento e revogar certificados"
                            >
                              <Ban size={15} />
                              Cancelar
                            </button>
                          </>
                        )}

                        <button
                          className={styles.deleteActionBtn}
                          onClick={() => setDeletingEvent(event)}
                          type="button"
                          title="Excluir evento permanentemente"
                        >
                          <Trash2 size={15} />
                          Excluir
                        </button>

                        <button
                          className={styles.manageBtn}
                          onClick={() => navigate(`/eventos/${event.id}/gerenciar`)}
                          type="button"
                        >
                          Acessar Evento
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <MessageModal
        visible={!!actionSuccess}
        tone="success"
        title="Ação concluída"
        message={actionSuccess ?? ""}
        confirmText="OK"
        onConfirm={() => setActionSuccess(null)}
        onDismiss={() => setActionSuccess(null)}
      />

      <CancelEventDialog
        isOpen={!!cancellingEvent}
        eventTitle={cancellingEvent?.title || ""}
        onClose={() => setCancellingEvent(null)}
        onConfirm={handleConfirmCancel}
      />

      <DeleteEventDialog
        isOpen={!!deletingEvent}
        eventTitle={deletingEvent?.title || ""}
        onClose={() => setDeletingEvent(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
