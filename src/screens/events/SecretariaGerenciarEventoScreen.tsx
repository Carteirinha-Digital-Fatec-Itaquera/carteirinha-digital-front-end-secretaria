import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  DoorClosed,
  DoorOpen,
  MapPin,
  RefreshCw,
  User,
  Users,
} from "lucide-react";

import { QRCodeSVG } from "qrcode.react";
import { useNavigate, useParams } from "react-router-dom";

import MenuLateral from "../../components/menuLateral/MenuLateral";
import styles from "./styleGerenciar.module.css";
import layoutStyles from "../../styles/layoutWithMenu.module.css";

type CheckpointStatus = "open" | "closed" | "finished";

type CheckpointType = "check-in" | "check-out";

interface EventData {
  id: string;
  title: string;
  speaker: string;
  date: string;
  location: string;
  startTime: string;
  endTime: string;
  workload: number;
  checkInStatus: CheckpointStatus;
  checkOutStatus: CheckpointStatus;
  entries?: number;
  exits?: number;
  confirmedAttendances?: number;
}

interface Metrics {
  entries: number;
  exits: number;
  confirmedAttendances: number;
}

const mockEvent: EventData = {
  id: "1",
  title: "Semana de Tecnologia FATEC Itaquera",
  speaker: "Carlos Eduardo Silva",
  date: "2026-10-05",
  location: "Auditório FATEC Itaquera",
  startTime: "19:00",
  endTime: "21:00",
  workload: 2,
  checkInStatus: "open",
  checkOutStatus: "closed",
  entries: 35,
  exits: 0,
  confirmedAttendances: 35,
};

export default function SecretariaGerenciarEventoScreen() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [event, setEvent] = useState<EventData | null>(null);

  const [checkInStatus, setCheckInStatus] =
    useState<CheckpointStatus>("closed");

  const [checkOutStatus, setCheckOutStatus] =
    useState<CheckpointStatus>("closed");

  const [metrics, setMetrics] = useState<Metrics>({
    entries: 0,
    exits: 0,
    confirmedAttendances: 0,
  });

  const [qrToken, setQrToken] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState(15);

  const activeCheckpoint = useMemo<CheckpointType | null>(() => {
    if (checkInStatus === "open") {
      return "check-in";
    }

    if (checkOutStatus === "open") {
      return "check-out";
    }

    return null;
  }, [checkInStatus, checkOutStatus]);

  const formatDate = (date: string) => {
    if (!date) {
      return "-";
    }

    const [year, month, day] = date.split("-");

    if (!year || !month || !day) {
      return date;
    }

    return `${day}/${month}/${year}`;
  };

  const generateMockQrToken = useCallback(
    (checkpoint: CheckpointType) => {
      const randomNumber = Math.random()
        .toString(36)
        .substring(2, 10);

      return `FATEC-${id}-${checkpoint}-${randomNumber}-${Date.now()}`;
    },
    [id]
  );

  const loadEvent = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      setTimeout(() => {
        setEvent(mockEvent);

        setCheckInStatus(mockEvent.checkInStatus);
        setCheckOutStatus(mockEvent.checkOutStatus);

        setMetrics({
          entries: mockEvent.entries ?? 0,
          exits: mockEvent.exits ?? 0,
          confirmedAttendances:
            mockEvent.confirmedAttendances ?? 0,
        });

        setLoading(false);
      }, 300);
    } catch (err) {
      console.error("Erro ao carregar evento:", err);
      setError("Não foi possível carregar os dados do evento.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const refreshQrCode = useCallback(async () => {
    if (!activeCheckpoint) {
      return;
    }

    try {
      setQrLoading(true);

      const newToken = generateMockQrToken(activeCheckpoint);

      setQrToken(newToken);
      setSecondsRemaining(15);
    } catch (err) {
      console.error("Erro ao atualizar QR Code:", err);
    } finally {
      setQrLoading(false);
    }
  }, [activeCheckpoint, generateMockQrToken]);

  useEffect(() => {
    if (!activeCheckpoint) {
      setQrToken("");
      setSecondsRemaining(15);
      return;
    }

    refreshQrCode();
  }, [activeCheckpoint, refreshQrCode]);

  useEffect(() => {
    if (!activeCheckpoint) {
      return;
    }

    const interval = window.setInterval(() => {
      setSecondsRemaining((previous) => {
        if (previous <= 1) {
          refreshQrCode();
          return 15;
        }

        return previous - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [activeCheckpoint, refreshQrCode]);

  async function handleOpenCheckpoint(type: CheckpointType) {
    try {
      setActionLoading(true);
      setError("");

      if (type === "check-in") {
        setCheckInStatus("open");
      } else {
        setCheckOutStatus("open");
      }

      setSecondsRemaining(15);
    } catch (err) {
      console.error("Erro ao abrir checkpoint:", err);
      setError(`Não foi possível abrir o ${type}.`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCloseCheckpoint(type: CheckpointType) {
    try {
      setActionLoading(true);
      setError("");

      if (type === "check-in") {
        setCheckInStatus("finished");
      } else {
        setCheckOutStatus("finished");
      }

      setQrToken("");
      setSecondsRemaining(15);

      if (type === "check-in") {
        setMetrics((previous) => ({
          ...previous,
          confirmedAttendances: previous.entries,
        }));
      }
    } catch (err) {
      console.error("Erro ao encerrar checkpoint:", err);
      setError(`Não foi possível encerrar o ${type}.`);
    } finally {
      setActionLoading(false);
    }
  }

  function getStatusLabel(status: CheckpointStatus) {
    if (status === "open") {
      return "Aberto";
    }

    if (status === "finished") {
      return "Encerrado";
    }

    return "Fechado";
  }

  function getStatusClass(status: CheckpointStatus) {
    if (status === "open") {
      return styles.statusOpen;
    }

    if (status === "finished") {
      return styles.statusFinished;
    }

    return styles.statusClosed;
  }

  function getCheckpointDescription(type: CheckpointType) {
    if (type === "check-in") {
      return "Escaneie este QR Code para registrar sua entrada";
    }

    return "Escaneie este QR Code para registrar sua saída";
  }

  if (loading) {
    return (
      <div className={layoutStyles.layoutContainer}>
        <div className={layoutStyles.menuWrapper}>
          <MenuLateral />
        </div>

        <div className={layoutStyles.contentWrapper}>
          <div className={styles.loadingContainer}>
            <RefreshCw
              size={28}
              className={styles.loadingIcon}
            />

            <p>Carregando evento...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className={layoutStyles.layoutContainer}>
        <div className={layoutStyles.menuWrapper}>
          <MenuLateral />
        </div>

        <div className={layoutStyles.contentWrapper}>
          <div className={styles.errorContainer}>
            <h2>Evento não encontrado</h2>

            <p>
              {error ||
                "Não foi possível encontrar este evento."}
            </p>

            <button
              className={styles.backButton}
              onClick={() => navigate("/eventos")}
            >
              <ArrowLeft size={18} />
              Voltar para eventos
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={layoutStyles.layoutContainer}>
      <div className={layoutStyles.menuWrapper}>
        <MenuLateral />
      </div>

      <div className={layoutStyles.contentWrapper}>
        <div className={styles.container}>
          <div className={styles.topBar}>
            <button
              className={styles.backButton}
              onClick={() => navigate("/eventos")}
            >
              <ArrowLeft size={18} />
              Voltar
            </button>

            <button
              className={styles.refreshButton}
              onClick={loadEvent}
              disabled={loading}
            >
              <RefreshCw size={17} />
              Atualizar
            </button>
          </div>

          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          <div className={styles.pageHeader}>
            <div className={styles.header}>
              <span className={styles.pageEyebrow}>
                CONTROLE DO EVENTO
              </span>

              <h1 className={styles.title}>
                {event.title}
              </h1>
            </div>
          </div>

          <div className={styles.eventInfoCard}>
            <div className={styles.eventInfoHeader}>
              <div>
                <h2>Informações do Evento</h2>
              </div>
            </div>

            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <User size={19} />

                <div>
                  <span>Palestrante</span>
                  <strong>{event.speaker}</strong>
                </div>
              </div>

              <div className={styles.infoItem}>
                <Calendar size={19} />

                <div>
                  <span>Data</span>
                  <strong>{formatDate(event.date)}</strong>
                </div>
              </div>

              <div className={styles.infoItem}>
                <MapPin size={19} />

                <div>
                  <span>Local</span>
                  <strong>{event.location}</strong>
                </div>
              </div>

              <div className={styles.infoItem}>
                <Clock size={19} />

                <div>
                  <span>Horário</span>

                  <strong>
                    {event.startTime} - {event.endTime}
                  </strong>
                </div>
              </div>

              <div className={styles.infoItem}>
                <Clock size={19} />

                <div>
                  <span>Carga Horária</span>
                  <strong>{event.workload}h</strong>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricIcon}>
                <DoorOpen size={22} />
              </div>

              <div>
                <span>Entradas registradas</span>
                <strong>{metrics.entries}</strong>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricIcon}>
                <DoorClosed size={22} />
              </div>

              <div>
                <span>Saídas registradas</span>
                <strong>{metrics.exits}</strong>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricIcon}>
                <Users size={22} />
              </div>

              <div>
                <span>Presenças confirmadas</span>

                <strong>
                  {metrics.confirmedAttendances}
                </strong>
              </div>
            </div>
          </div>

          <div className={styles.controlCard}>
            <div className={styles.cardHeader}>
              <div>
                <span className={styles.cardEyebrow}>
                  CHECKPOINTS
                </span>

                <h2>Controle de Presença</h2>

                <p>
                  Abra ou encerre os checkpoints conforme o
                  andamento do evento.
                </p>
              </div>
            </div>

            <div className={styles.checkpointsGrid}>
              <div
                className={`${styles.checkpointCard} ${
                  checkInStatus === "open"
                    ? styles.checkpointActive
                    : ""
                }`}
              >
                <div className={styles.checkpointHeader}>
                  <div>
                    <span className={styles.checkpointLabel}>
                      CHECK-IN
                    </span>

                    <h3>Registro de Entrada</h3>
                  </div>

                  <span
                    className={`${styles.status} ${getStatusClass(
                      checkInStatus
                    )}`}
                  >
                    {getStatusLabel(checkInStatus)}
                  </span>
                </div>

                <p className={styles.checkpointDescription}>
                  Controle das entradas dos alunos no evento.
                </p>

                <div className={styles.checkpointActions}>
                  {checkInStatus === "closed" && (
                    <button
                      className={styles.openButton}
                      onClick={() =>
                        handleOpenCheckpoint("check-in")
                      }
                      disabled={actionLoading}
                    >
                      <DoorOpen size={18} />
                      Abrir Check-in
                    </button>
                  )}

                  {checkInStatus === "open" && (
                    <button
                      className={styles.closeButton}
                      onClick={() =>
                        handleCloseCheckpoint("check-in")
                      }
                      disabled={actionLoading}
                    >
                      <DoorClosed size={18} />
                      Encerrar Check-in
                    </button>
                  )}

                  {checkInStatus === "finished" && (
                    <div className={styles.finishedMessage}>
                      <CheckCircle2 size={18} />
                      Check-in encerrado
                    </div>
                  )}
                </div>
              </div>

              <div
                className={`${styles.checkpointCard} ${
                  checkOutStatus === "open"
                    ? styles.checkpointActive
                    : ""
                }`}
              >
                <div className={styles.checkpointHeader}>
                  <div>
                    <span className={styles.checkpointLabel}>
                      CHECK-OUT
                    </span>

                    <h3>Registro de Saída</h3>
                  </div>

                  <span
                    className={`${styles.status} ${getStatusClass(
                      checkOutStatus
                    )}`}
                  >
                    {getStatusLabel(checkOutStatus)}
                  </span>
                </div>

                <p className={styles.checkpointDescription}>
                  Controle das saídas dos alunos ao final do
                  evento.
                </p>

                <div className={styles.checkpointActions}>
                  {checkOutStatus === "closed" &&
                    checkInStatus === "finished" && (
                      <button
                        className={styles.openButton}
                        onClick={() =>
                          handleOpenCheckpoint("check-out")
                        }
                        disabled={actionLoading}
                      >
                        <DoorOpen size={18} />
                        Abrir Check-out
                      </button>
                    )}

                  {checkOutStatus === "closed" &&
                    checkInStatus !== "finished" && (
                      <div className={styles.blockedMessage}>
                        Encerre o Check-in para abrir o
                        Check-out.
                      </div>
                    )}

                  {checkOutStatus === "open" && (
                    <button
                      className={styles.closeButton}
                      onClick={() =>
                        handleCloseCheckpoint("check-out")
                      }
                      disabled={actionLoading}
                    >
                      <DoorClosed size={18} />
                      Encerrar Check-out
                    </button>
                  )}

                  {checkOutStatus === "finished" && (
                    <div className={styles.finishedMessage}>
                      <CheckCircle2 size={18} />
                      Check-out encerrado
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {activeCheckpoint && (
            <div className={styles.projectionCard}>
              <div className={styles.projectionHeader}>
                <div>
                  <span className={styles.projectionEyebrow}>
                    PROJEÇÃO
                  </span>

                  <h2>
                    QR Code de{" "}
                    {activeCheckpoint === "check-in"
                      ? "Check-in"
                      : "Check-out"}
                  </h2>

                  <p>
                    {getCheckpointDescription(
                      activeCheckpoint
                    )}
                  </p>
                </div>

                <div className={styles.liveIndicator}>
                  <span />
                  AO VIVO
                </div>
              </div>

              <div className={styles.projectionContent}>
                <div className={styles.qrWrapper}>
                  <div className={styles.qrContainer}>
                    {qrToken ? (
                      <QRCodeSVG
                        value={qrToken}
                        size={240}
                        level="H"
                        bgColor="#ffffff"
                        fgColor="#000000"
                        includeMargin
                      />
                    ) : (
                      <div className={styles.qrLoading}>
                        <RefreshCw
                          size={34}
                          className={styles.loadingIcon}
                        />

                        <span>
                          Gerando QR Code...
                        </span>
                      </div>
                    )}
                  </div>

                  <div className={styles.qrInstruction}>
                    <strong>
                      {activeCheckpoint === "check-in"
                        ? "Escaneie para registrar sua entrada"
                        : "Escaneie para registrar sua saída"}
                    </strong>

                    <span>
                      Aponte a câmera do celular para o
                      código acima.
                    </span>
                  </div>
                </div>

                <div className={styles.timerPanel}>
                  <div className={styles.timerIcon}>
                    <RefreshCw size={28} />
                  </div>

                  <span className={styles.timerLabel}>
                    Próxima atualização em
                  </span>

                  <strong className={styles.timer}>
                    {secondsRemaining}s
                  </strong>

                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressBar}
                      style={{
                        width: `${
                          (secondsRemaining / 15) * 100
                        }%`,
                      }}
                    />
                  </div>

                  <p>
                    O código é renovado automaticamente a
                    cada 15 segundos.
                  </p>

                  <button
                    className={styles.manualRefresh}
                    onClick={refreshQrCode}
                    disabled={qrLoading}
                  >
                    <RefreshCw
                      size={16}
                      className={
                        qrLoading
                          ? styles.spinning
                          : ""
                      }
                    />
                    Atualizar agora
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}