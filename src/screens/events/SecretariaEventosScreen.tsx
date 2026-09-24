import { useEffect, useMemo, useState } from "react";

import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Search,
  Settings,
  User,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import MenuLateral from "../../components/menuLateral/MenuLateral";

import styles from "./style.module.css";

import layoutStyles from "../../styles/layoutWithMenu.module.css";

type EventStatus = "open" | "closed" | "finished";

interface Event {
  id: string;
  title: string;
  speaker: string;
  date: string;
  location: string;
  startTime: string;
  endTime: string;
  workload: number;
  checkInStatus: EventStatus;
  checkOutStatus: EventStatus;
}

const statusLabel: Record<EventStatus, string> = {
  open: "Aberto",
  closed: "Fechado",
  finished: "Encerrado",
};

export default function SecretariaEventosScreen() {
  const navigate = useNavigate();

  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      setLoading(true);

      const response = await fetch("/events");

      if (!response.ok) {
        throw new Error("Erro ao buscar eventos");
      }

      const data = await response.json();

      setEvents(data);
    } catch (error) {
      console.error("Erro ao carregar eventos:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        event.title.toLowerCase().includes(searchText) ||
        event.speaker.toLowerCase().includes(searchText);

      const matchesStatus =
        statusFilter === "all" ||
        event.checkInStatus === statusFilter ||
        event.checkOutStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [events, search, statusFilter]);

  function formatDate(date: string) {
    if (!date) return "-";

    const [year, month, day] = date.split("-");

    if (!year || !month || !day) {
      return date;
    }

    return `${day}/${month}/${year}`;
  }

  function getStatusClass(status: EventStatus) {
    if (status === "open") {
      return styles.statusOpen;
    }

    if (status === "closed") {
      return styles.statusClosed;
    }

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
              <h1 className={styles.title}>
                Eventos
              </h1>

              <p className={styles.subtitle}>
                Gerenciar Eventos
              </p>
            </div>

            <button
              className={styles.addBtn}
              onClick={() => navigate("/criar-evento")}
            >
              <Plus size={18} />
              Novo Evento
            </button>
          </div>

          <div className={styles.filterBar}>
            <div className={styles.searchArea}>
              <div className={styles.searchBox}>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Buscar por evento ou palestrante"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <span className={styles.searchIcon}>
                  <Search size={18} />
                </span>
              </div>
            </div>

            <div className={styles.filterSelects}>
              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">
                  Todos os status
                </option>

                <option value="open">
                  Aberto
                </option>

                <option value="closed">
                  Fechado
                </option>

                <option value="finished">
                  Encerrado
                </option>
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
              >
                Atualizar
              </button>
            </div>

            {loading ? (
              <div className={styles.empty}>
                <p>
                  Carregando eventos...
                </p>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className={styles.empty}>
                <Calendar size={40} />

                <h3>
                  Nenhum evento encontrado
                </h3>

                <p>
                  Não encontramos eventos com os filtros selecionados.
                </p>
              </div>
            ) : (
              <div className={styles.eventsList}>
                {filteredEvents.map((event) => (
                  <div
                    className={styles.eventCard}
                    key={event.id}
                  >
                    <div className={styles.eventHeader}>
                      <div>
                        <h2 className={styles.eventTitle}>
                          {event.title}
                        </h2>

                        <div className={styles.speaker}>
                          <User size={16} />
                          {event.speaker}
                        </div>
                      </div>
                    </div>

                    <div className={styles.eventMeta}>
                      <span>
                        <Calendar size={16} />
                        {formatDate(event.date)}
                      </span>

                      <span>
                        <Clock size={16} />
                        {event.startTime} - {event.endTime}
                      </span>

                      <span>
                        <MapPin size={16} />
                        {event.location}
                      </span>

                      <span>
                        {event.workload}h
                      </span>
                    </div>

                    <div className={styles.checkpoints}>
                      <div className={styles.checkpoint}>
                        <span>
                          Check-in
                        </span>

                        <span
                          className={`${styles.status} ${getStatusClass(
                            event.checkInStatus
                          )}`}
                        >
                          {statusLabel[event.checkInStatus]}
                        </span>
                      </div>

                      <div className={styles.checkpoint}>
                        <span>
                          Check-out
                        </span>

                        <span
                          className={`${styles.status} ${getStatusClass(
                            event.checkOutStatus
                          )}`}
                        >
                          {statusLabel[event.checkOutStatus]}
                        </span>
                      </div>
                    </div>

                    <div className={styles.actions}>
                      <button
                        className={styles.manageBtn}
                        onClick={() =>
                          navigate(
                            `/eventos/${event.id}/gerenciar`
                          )
                        }
                      >
                        <Settings size={17} />
                        Gerenciar Evento
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}