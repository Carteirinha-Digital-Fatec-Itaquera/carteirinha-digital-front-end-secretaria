import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Award,
  Users,
  CheckCircle2,
  DoorOpen,
  DoorClosed,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

import MenuLateral from "../../components/menuLateral/MenuLateral";
import { getEvent } from "../../api/event/eventService";
import {
  openCheckpoint,
  closeCheckpoint,
  getCheckpointQr,
} from "../../api/event/checkpointService";
import type { EventView } from "../../domains/Event";
import type { CheckpointType, CheckpointView } from "../../domains/Checkpoint";
import {
  formatEventDate,
  formatEventTime,
  formatWorkload,
} from "../../utils/eventPresentation";

import { useEventParticipants } from "./hooks/useEventParticipants";
import { ParticipantsPanel } from "./components/ParticipantsPanel";
import { RafflePanel } from "./components/RafflePanel";

import styles from "./styleGerenciar.module.css";
import layoutStyles from "../../styles/layoutWithMenu.module.css";

type CheckpointDisplayStatus = "open" | "closed" | "finished";

function computeCheckpointStatus(
  cp: CheckpointView | undefined
): CheckpointDisplayStatus {
  if (!cp) return "closed";
  if (cp.isOpen) return "open";
  if (cp.closedAt) return "finished";
  return "closed";
}

function getStatusLabel(status: CheckpointDisplayStatus): string {
  if (status === "open") return "Aberto";
  if (status === "closed") return "Fechado";
  return "Encerrado";
}

export default function SecretariaGerenciarEventoScreen() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [event, setEvent] = useState<EventView | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [eventError, setEventError] = useState<string | null>(null);

  const [activeCheckpoint, setActiveCheckpoint] = useState<
    "check-in" | "check-out" | null
  >(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(20);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  // Integração com Issue #7: hook de participantes reais
  const participants = useEventParticipants(id || "");

  const loadEventData = useCallback(async () => {
    if (!id) return;
    try {
      setLoadingEvent(true);
      setEventError(null);
      const data = await getEvent(id);
      setEvent(data);

      // Sincroniza checkpoint ativo se algum estiver aberto
      const checkInCp = data.checkpoints?.find((c) => c.type === "CHECK_IN");
      const checkOutCp = data.checkpoints?.find((c) => c.type === "CHECK_OUT");

      if (checkInCp?.isOpen) {
        setActiveCheckpoint("check-in");
      } else if (checkOutCp?.isOpen) {
        setActiveCheckpoint("check-out");
      } else {
        setActiveCheckpoint(null);
        setQrToken(null);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Falha ao carregar os dados do evento";
      setEventError(msg);
    } finally {
      setLoadingEvent(false);
    }
  }, [id]);

  useEffect(() => {
    isMountedRef.current = true;
    void loadEventData();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadEventData]);

  // Busca e renovação do QR Code de presença
  const fetchQrToken = useCallback(
    async (type: "check-in" | "check-out") => {
      if (!id) return;
      try {
        setQrLoading(true);
        const cpType: CheckpointType =
          type === "check-in" ? "CHECK_IN" : "CHECK_OUT";
        const qrData = await getCheckpointQr(id, cpType);

        if (!isMountedRef.current) return;
        setQrToken(qrData.qrToken);
        setSecondsRemaining(qrData.expiresInSeconds || 20);
      } catch (err: unknown) {
        if (!isMountedRef.current) return;
        console.error("Erro ao obter token do QR Code:", err);
      } finally {
        if (isMountedRef.current) {
          setQrLoading(false);
        }
      }
    },
    [id]
  );

  // Inicia e renova timer do QR Code quando um checkpoint estiver ativo
  useEffect(() => {
    if (!activeCheckpoint) {
      setQrToken(null);
      return;
    }

    void fetchQrToken(activeCheckpoint);

    // Contagem regressiva em segundos
    const timerId = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          void fetchQrToken(activeCheckpoint);
          return 20;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timerId);
    };
  }, [activeCheckpoint, fetchQrToken]);

  async function handleOpenCheckpoint(type: "check-in" | "check-out") {
    if (!id || actionLoading) return;
    try {
      setActionLoading(true);
      setActionError(null);
      const cpType: CheckpointType =
        type === "check-in" ? "CHECK_IN" : "CHECK_OUT";
      await openCheckpoint(id, cpType);
      setActiveCheckpoint(type);
      await loadEventData();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao abrir o checkpoint.";
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCloseCheckpoint(type: "check-in" | "check-out") {
    if (!id || actionLoading) return;
    try {
      setActionLoading(true);
      setActionError(null);
      const cpType: CheckpointType =
        type === "check-in" ? "CHECK_IN" : "CHECK_OUT";
      await closeCheckpoint(id, cpType);
      if (activeCheckpoint === type) {
        setActiveCheckpoint(null);
        setQrToken(null);
      }
      await loadEventData();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Erro ao encerrar o checkpoint.";
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  }

  const checkInCp = event?.checkpoints?.find((c) => c.type === "CHECK_IN");
  const checkOutCp = event?.checkpoints?.find((c) => c.type === "CHECK_OUT");

  const checkInStatus = computeCheckpointStatus(checkInCp);
  const checkOutStatus = computeCheckpointStatus(checkOutCp);

  function getStatusClass(status: CheckpointDisplayStatus) {
    if (status === "open") return styles.statusOpen;
    if (status === "closed") return styles.statusClosed;
    return styles.statusFinished;
  }

  if (loadingEvent) {
    return (
      <div className={layoutStyles.layoutContainer}>
        <div className={layoutStyles.menuWrapper}>
          <MenuLateral />
        </div>
        <div className={layoutStyles.contentWrapper}>
          <div className={styles.container}>
            <div className={styles.loadingWrapper} style={{ padding: "40px", textAlign: "center" }}>
              <p>Carregando painel do evento...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <div className={layoutStyles.layoutContainer}>
        <div className={layoutStyles.menuWrapper}>
          <MenuLateral />
        </div>
        <div className={layoutStyles.contentWrapper}>
          <div className={styles.container}>
            <div className={styles.topBar}>
              <button
                type="button"
                className={styles.backButton}
                onClick={() => navigate("/eventos")}
              >
                <ArrowLeft size={16} />
                Voltar para Eventos
              </button>
            </div>
            <div style={{ textAlign: "center", padding: "40px" }}>
              <AlertCircle size={48} color="#e63946" style={{ margin: "0 auto 16px" }} />
              <h2>Não foi possível carregar o evento</h2>
              <p>{eventError || "Evento não encontrado"}</p>
              <button
                type="button"
                className={styles.refreshButton}
                onClick={loadEventData}
                style={{ marginTop: "16px" }}
              >
                Tentar novamente
              </button>
            </div>
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
              type="button"
              className={styles.backButton}
              onClick={() => navigate("/eventos")}
            >
              <ArrowLeft size={16} />
              Voltar para Eventos
            </button>

            <button
              type="button"
              className={styles.refreshButton}
              onClick={() => {
                void loadEventData();
                void participants.refresh();
              }}
              disabled={loadingEvent || participants.refreshing}
            >
              <RefreshCw
                size={16}
                className={participants.refreshing ? styles.spinning : ""}
              />
              Atualizar Painel
            </button>
          </div>

          <div className={styles.pageHeader}>
            <div className={styles.header}>
              <span className={styles.pageEyebrow}>PAINEL DO EVENTO</span>
              <h1 className={styles.title}>{event.title}</h1>
              <p className={styles.subtitle}>
                Controle de presença em tempo real e sorteios
              </p>
            </div>
          </div>

          {actionError && (
            <div
              style={{
                backgroundColor: "#fee2e2",
                color: "#b91c1c",
                padding: "12px 18px",
                borderRadius: "8px",
                marginBottom: "20px",
                fontSize: "14px",
                fontWeight: 600,
              }}
              role="alert"
            >
              ⚠️ {actionError}
            </div>
          )}

          {/* Cartão de Informações do Evento */}
          <div className={styles.eventInfoCard}>
            <div className={styles.eventInfoHeader}>
              <span className={styles.cardEyebrow}>DADOS DO EVENTO</span>
              <h2>Informações Gerais</h2>
            </div>

            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <User size={18} />
                <div>
                  <span>Palestrante</span>
                  <strong>{event.speaker}</strong>
                </div>
              </div>

              <div className={styles.infoItem}>
                <Calendar size={18} />
                <div>
                  <span>Data</span>
                  <strong>{formatEventDate(event.startsAt)}</strong>
                </div>
              </div>

              <div className={styles.infoItem}>
                <Clock size={18} />
                <div>
                  <span>Horário</span>
                  <strong>
                    {formatEventTime(event.startsAt)} -{" "}
                    {formatEventTime(event.endsAt)}
                  </strong>
                </div>
              </div>

              <div className={styles.infoItem}>
                <MapPin size={18} />
                <div>
                  <span>Local</span>
                  <strong>{event.location}</strong>
                </div>
              </div>

              <div className={styles.infoItem}>
                <Award size={18} />
                <div>
                  <span>Carga Horária</span>
                  <strong>{formatWorkload(event.workloadMinutes)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Cards de Métricas */}
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricIcon}>
                <Users size={22} />
              </div>
              <div>
                <span>Total com Check-in</span>
                <strong>
                  {participants.summary?.checkedInCount ??
                    participants.items.length}
                </strong>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricIcon}>
                <CheckCircle2 size={22} />
              </div>
              <div>
                <span>Presenças Confirmadas (Check-out)</span>
                <strong>
                  {participants.summary?.confirmedCount ??
                    participants.items.filter((i) => i.status === "CONFIRMED")
                      .length}
                </strong>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricIcon}>
                <Award size={22} />
              </div>
              <div>
                <span>Certificados</span>
                <strong>
                  {event.certificateEnabled ? "Habilitados" : "Desabilitados"}
                </strong>
              </div>
            </div>
          </div>

          {/* Controle de Checkpoints */}
          <div className={styles.controlCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardEyebrow}>OPERAÇÃO</span>
              <h2>Controle de Checkpoints</h2>
              <p>Abra e encerre os registros de presença dos alunos no evento</p>
            </div>

            <div className={styles.checkpointsGrid}>
              {/* Check-in */}
              <div
                className={`${styles.checkpointCard} ${
                  checkInStatus === "open" ? styles.checkpointActive : ""
                }`}
              >
                <div className={styles.checkpointHeader}>
                  <div>
                    <span className={styles.checkpointLabel}>CHECK-IN</span>
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
                      onClick={() => handleOpenCheckpoint("check-in")}
                      disabled={actionLoading}
                      type="button"
                    >
                      <DoorOpen size={18} />
                      Abrir Check-in
                    </button>
                  )}

                  {checkInStatus === "open" && (
                    <button
                      className={styles.closeButton}
                      onClick={() => handleCloseCheckpoint("check-in")}
                      disabled={actionLoading}
                      type="button"
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

              {/* Check-out */}
              <div
                className={`${styles.checkpointCard} ${
                  checkOutStatus === "open" ? styles.checkpointActive : ""
                }`}
              >
                <div className={styles.checkpointHeader}>
                  <div>
                    <span className={styles.checkpointLabel}>CHECK-OUT</span>
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
                  Controle das saídas dos alunos ao final do evento. Apenas
                  alunos com check-in e check-out recebem presença confirmada.
                </p>

                <div className={styles.checkpointActions}>
                  {checkOutStatus === "closed" &&
                    checkInStatus === "finished" && (
                      <button
                        className={styles.openButton}
                        onClick={() => handleOpenCheckpoint("check-out")}
                        disabled={actionLoading}
                        type="button"
                      >
                        <DoorOpen size={18} />
                        Abrir Check-out
                      </button>
                    )}

                  {checkOutStatus === "closed" &&
                    checkInStatus !== "finished" && (
                      <div className={styles.blockedMessage}>
                        Encerre o Check-in para abrir o Check-out.
                      </div>
                    )}

                  {checkOutStatus === "open" && (
                    <button
                      className={styles.closeButton}
                      onClick={() => handleCloseCheckpoint("check-out")}
                      disabled={actionLoading}
                      type="button"
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

          {/* Projeção do QR Code em tempo real */}
          {activeCheckpoint && (
            <div className={styles.projectionCard}>
              <div className={styles.projectionHeader}>
                <div>
                  <span className={styles.projectionEyebrow}>PROJEÇÃO</span>
                  <h2>
                    QR Code de{" "}
                    {activeCheckpoint === "check-in" ? "Check-in" : "Check-out"}
                  </h2>
                  <p>
                    {activeCheckpoint === "check-in"
                      ? "Aponte a câmera para registrar a entrada dos participantes no evento."
                      : "Aponte a câmera para registrar a saída e validar a presença com certificado."}
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
                        <RefreshCw size={34} className={styles.loadingIcon} />
                        <span>Gerando QR Code...</span>
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
                      Aponte a câmera do aplicativo para o código acima.
                    </span>
                  </div>
                </div>

                <div className={styles.timerPanel}>
                  <div className={styles.timerIcon}>
                    <RefreshCw size={28} />
                  </div>

                  <span className={styles.timerLabel}>
                    Próxima renovação em
                  </span>
                  <strong className={styles.timer}>
                    {secondsRemaining}s
                  </strong>

                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressBar}
                      style={{
                        width: `${Math.min(100, (secondsRemaining / 20) * 100)}%`,
                      }}
                    />
                  </div>

                  <p>O código é renovado dinamicamente para evitar fraudes.</p>

                  <button
                    type="button"
                    className={styles.manualRefresh}
                    onClick={() => void fetchQrToken(activeCheckpoint)}
                    disabled={qrLoading}
                  >
                    <RefreshCw
                      size={16}
                      className={qrLoading ? styles.spinning : ""}
                    />
                    Renovar agora
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Painel de Participantes (Issue #7) */}
          <div style={{ marginTop: "24px" }}>
            <ParticipantsPanel
              items={participants.items}
              loading={participants.loading}
              refreshing={participants.refreshing}
              stale={participants.stale}
              error={participants.error}
              lastUpdatedAt={participants.lastUpdatedAt}
              onRefresh={participants.refresh}
            />
          </div>

          {/* Painel de Sorteio (Issue #7) */}
          <div style={{ marginTop: "24px" }}>
            <RafflePanel
              items={participants.items}
              loading={participants.loading}
              refreshing={participants.refreshing}
              onRefresh={participants.refresh}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
