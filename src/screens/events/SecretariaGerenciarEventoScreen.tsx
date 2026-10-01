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
  Maximize2,
  Minimize2,
  Edit2,
  Ban,
} from "lucide-react";

import MenuLateral from "../../components/menuLateral/MenuLateral";
import { getEvent, cancelEvent } from "../../api/event/eventService";
import { CancelEventDialog } from "./components/CancelEventDialog";
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
import { GLOBAL_VAR } from "../../api/config/globalVar";
import { validatedAttendanceQrUrl } from "../../utils/attendanceQrLink";

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
  const [qrData, setQrData] = useState<{
    qrToken: string;
    qrUrl?: string;
    expiresAtEpoch: number;
  } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(20);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelSuccessMessage, setCancelSuccessMessage] = useState<string | null>(null);

  const isCancelled = event?.status === "CANCELLED";

  const handleConfirmCancel = async (reason: string) => {
    if (!id) return;
    try {
      setActionLoading(true);
      setActionError(null);
      const updated = await cancelEvent(id, { reason });
      setEvent(updated);
      setIsCancelDialogOpen(false);
      setActiveCheckpoint(null);
      setCancelSuccessMessage("Evento cancelado com sucesso. Checkpoints fechados e certificados revogados.");
      setTimeout(() => setCancelSuccessMessage(null), 6000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao cancelar evento.";
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const serverOffsetMsRef = useRef<number>(0);
  const fullscreenContainerRef = useRef<HTMLDivElement | null>(null);

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
        setQrData(null);
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

  // Busca e renovação do QR Code de presença (com controle de sobreposição e latência)
  const fetchQrToken = useCallback(
    async (type: "check-in" | "check-out") => {
      if (!id || isFetchingRef.current) return;
      try {
        isFetchingRef.current = true;
        setQrLoading(true);
        setQrError(null);

        // Cancela requisição anterior se houver
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const cpType: CheckpointType =
          type === "check-in" ? "CHECK_IN" : "CHECK_OUT";
        const response = await getCheckpointQr(id, cpType, {
          signal: controller.signal,
        });

        if (!isMountedRef.current) return;

        const now = Date.now();
        const serverTimeMs = response.serverTime
          ? new Date(response.serverTime).getTime()
          : now;
        const serverOffsetMs = serverTimeMs - now;
        serverOffsetMsRef.current = serverOffsetMs;

        // Horário de expiração ajustado ao relógio local
        const expiresAtEpoch =
          new Date(response.expiresAt).getTime() - serverOffsetMs;
        const initialRemainingSec = Math.max(
          0,
          Math.ceil((expiresAtEpoch - now) / 1000)
        );

        const validUrl = response.qrUrl
          ? validatedAttendanceQrUrl(response.qrUrl, GLOBAL_VAR.STUDENT_APP_URL)
          : null;

        if (!validUrl) {
          setQrData(null);
          setQrError("Não foi possível gerar o link de presença. Tente atualizar.");
          return;
        }

        setQrData({
          qrToken: response.qrToken,
          qrUrl: validUrl,
          expiresAtEpoch,
        });
        setSecondsRemaining(initialRemainingSec > 0 ? initialRemainingSec : 20);
      } catch (err: unknown) {
        if (!isMountedRef.current) return;
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        const msg =
          err instanceof Error
            ? err.message
            : "Erro ao atualizar o QR Code";
        setQrError(msg);
        console.error("Erro ao obter token do QR Code:", err);
      } finally {
        isFetchingRef.current = false;
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
      setQrData(null);
      setQrError(null);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      return;
    }

    void fetchQrToken(activeCheckpoint);

    // Monitora a cada 500ms o tempo restante real baseado em expiresAtEpoch
    const timerId = setInterval(() => {
      setQrData((currentQr) => {
        if (!currentQr) return null;

        const now = Date.now();
        const remainingMs = currentQr.expiresAtEpoch - now;
        const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
        setSecondsRemaining(remainingSec);

        // Se expirou, limpa imediatamente da tela para nunca exibir QR vencido
        if (remainingMs <= 0) {
          if (!isFetchingRef.current) {
            void fetchQrToken(activeCheckpoint);
          }
          return null;
        }

        // Renovação preventiva aos 15 segundos (5s antes do vencimento de 20s)
        if (remainingMs <= 5000 && !isFetchingRef.current) {
          void fetchQrToken(activeCheckpoint);
        }

        return currentQr;
      });
    }, 500);

    // Retorno de aba oculta: atualiza imediatamente se estiver próximo ou já vencido
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setQrData((currentQr) => {
          if (!currentQr) {
            void fetchQrToken(activeCheckpoint);
            return null;
          }
          const remainingMs = currentQr.expiresAtEpoch - Date.now();
          if (remainingMs <= 5000) {
            void fetchQrToken(activeCheckpoint);
          }
          return currentQr;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(timerId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [activeCheckpoint, fetchQrToken]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        if (fullscreenContainerRef.current?.requestFullscreen) {
          await fullscreenContainerRef.current.requestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch {
      setIsFullscreen((prev) => !prev);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignora erro ao sair de tela cheia
    } finally {
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

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
        setQrData(null);
        if (isFullscreen) {
          void exitFullscreen();
        }
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

  const qrValue = qrData?.qrUrl
    ? validatedAttendanceQrUrl(qrData.qrUrl, GLOBAL_VAR.STUDENT_APP_URL)
    : null;

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

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {!isCancelled && (
                <>
                  <button
                    type="button"
                    onClick={() => navigate(`/eventos/${id}/editar`)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 14px",
                      borderRadius: "6px",
                      backgroundColor: "#f3f4f6",
                      border: "1px solid #d1d5db",
                      color: "#374151",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <Edit2 size={15} />
                    Editar Evento
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCancelDialogOpen(true)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 14px",
                      borderRadius: "6px",
                      backgroundColor: "#fee2e2",
                      border: "1px solid #fca5a5",
                      color: "#b91c1c",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <Ban size={15} />
                    Cancelar Evento
                  </button>
                </>
              )}

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
          </div>

          {isCancelled && (
            <div className={styles.cancelledBanner} role="alert">
              <Ban size={28} style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <h3 className={styles.cancelledBannerTitle}>
                  Evento Cancelado
                </h3>
                <p className={styles.cancelledBannerDesc}>
                  Este evento foi formalmente cancelado. Todos os checkpoints foram encerrados e os certificados eventualmente emitidos foram <strong>revogados</strong>.
                </p>
                {event.cancelReason && (
                  <p style={{ marginTop: "8px", fontWeight: 600 }}>
                    Motivo: {event.cancelReason}
                  </p>
                )}
                {event.cancelledAt && (
                  <p style={{ marginTop: "4px", fontSize: "12px", opacity: 0.85 }}>
                    Cancelado em: {new Date(event.cancelledAt).toLocaleString("pt-BR")}
                  </p>
                )}
              </div>
            </div>
          )}

          {cancelSuccessMessage && (
            <div
              style={{
                backgroundColor: "#ecfdf5",
                color: "#065f46",
                border: "1px solid #a7f3d0",
                padding: "12px 18px",
                borderRadius: "8px",
                marginBottom: "20px",
                fontSize: "14px",
                fontWeight: 600,
              }}
              role="status"
            >
              ✅ {cancelSuccessMessage}
            </div>
          )}

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
                  {isCancelled && checkInStatus === "closed" && (
                    <div className={styles.blockedMessage}>
                      Evento cancelado. Novos checkpoints não podem ser abertos.
                    </div>
                  )}

                  {!isCancelled && checkInStatus === "closed" && (
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
                  {isCancelled && checkOutStatus === "closed" && (
                    <div className={styles.blockedMessage}>
                      Evento cancelado. Novos checkpoints não podem ser abertos.
                    </div>
                  )}

                  {!isCancelled &&
                    checkOutStatus === "closed" &&
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

                  {!isCancelled &&
                    checkOutStatus === "closed" &&
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

                <div className={styles.projectionActions}>
                  <button
                    type="button"
                    className={styles.fullscreenButton}
                    onClick={toggleFullscreen}
                    title="Abrir em Tela Inteira / Telão"
                  >
                    <Maximize2 size={16} />
                    Modo Telão
                  </button>
                  <div className={styles.liveIndicator}>
                    <span />
                    AO VIVO
                  </div>
                </div>
              </div>

              <div className={styles.projectionContent}>
                <div className={styles.qrWrapper}>
                  <div className={styles.qrContainer}>
                    {qrValue ? (
                      <QRCodeSVG
                        value={qrValue}
                        size={250}
                        level="M"
                        bgColor="#ffffff"
                        fgColor="#000000"
                        includeMargin
                        data-testid="attendance-qr"
                        role="img"
                        aria-label="QR Code de presença para câmera nativa"
                      />
                    ) : (
                      <div className={styles.qrLoading}>
                        <RefreshCw size={34} className={styles.loadingIcon} />
                        <span role={qrError ? "alert" : undefined}>
                          {qrLoading
                            ? "Renovando QR Code..."
                            : qrError || "Aguardando novo QR Code..."}
                        </span>
                        {qrError && (
                          <button
                            type="button"
                            className={styles.manualRefresh}
                            onClick={() => void fetchQrToken(activeCheckpoint)}
                            disabled={qrLoading}
                            style={{ marginTop: "12px" }}
                          >
                            <RefreshCw size={14} />
                            Tentar novamente
                          </button>
                        )}
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

          {/* Modo Telão em Tela Cheia para Auditórios / Projetores */}
          {isFullscreen && activeCheckpoint && (
            <div
              ref={fullscreenContainerRef}
              className={styles.fullscreenOverlay}
            >
              <div className={styles.fullscreenTopBar}>
                <div className={styles.fullscreenTitleGroup}>
                  <span className={styles.fullscreenEyebrow}>
                    <span
                      className={styles.liveIndicator}
                      style={{ padding: "3px 8px" }}
                    >
                      <span /> AO VIVO
                    </span>
                    {activeCheckpoint === "check-in"
                      ? "Check-in (Entrada)"
                      : "Check-out (Saída)"}
                  </span>
                  <h1 className={styles.fullscreenTitle}>{event.title}</h1>
                </div>

                <button
                  type="button"
                  className={styles.fullscreenExitButton}
                  onClick={exitFullscreen}
                >
                  <Minimize2 size={18} />
                  Sair do Telão (ESC)
                </button>
              </div>

              <div className={styles.fullscreenCenter}>
                <div className={styles.fullscreenQrCard}>
                  {qrValue ? (
                    <QRCodeSVG
                      value={qrValue}
                      size={400}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#000000"
                      includeMargin
                      data-testid="attendance-qr"
                      role="img"
                      aria-label="QR Code de presença para câmera nativa"
                    />
                  ) : (
                    <div
                      className={styles.qrLoading}
                      style={{ width: "400px", height: "400px" }}
                    >
                      <RefreshCw size={48} className={styles.loadingIcon} />
                      <span role={qrError ? "alert" : undefined} style={{ fontSize: "18px" }}>
                        {qrLoading
                          ? "Renovando QR Code..."
                          : qrError || "Aguardando novo QR Code..."}
                      </span>
                      {qrError && (
                        <button
                          type="button"
                          className={styles.manualRefresh}
                          onClick={() => void fetchQrToken(activeCheckpoint)}
                          disabled={qrLoading}
                          style={{ marginTop: "16px" }}
                        >
                          <RefreshCw size={16} />
                          Tentar novamente
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className={styles.fullscreenInstruction}>
                  <strong>
                    {activeCheckpoint === "check-in"
                      ? "Aponte a câmera do celular para confirmar sua entrada"
                      : "Aponte a câmera do celular para confirmar sua saída e presença"}
                  </strong>
                  <span>
                    Toque no link ou escaneie pelo aplicativo da Carteirinha Digital.
                  </span>
                </div>
              </div>

              <div className={styles.fullscreenBottomBar}>
                <div className={styles.fullscreenTimer}>
                  <span>Renovação preventiva em:</span>
                  <strong>{secondsRemaining}s</strong>
                </div>
                <div className={styles.fullscreenProgressTrack}>
                  <div
                    className={styles.fullscreenProgressBar}
                    style={{
                      width: `${Math.min(100, (secondsRemaining / 20) * 100)}%`,
                    }}
                  />
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

      <CancelEventDialog
        isOpen={isCancelDialogOpen}
        eventTitle={event?.title || ""}
        onClose={() => setIsCancelDialogOpen(false)}
        onConfirm={handleConfirmCancel}
        isSubmitting={actionLoading}
      />
    </div>
  );
}
