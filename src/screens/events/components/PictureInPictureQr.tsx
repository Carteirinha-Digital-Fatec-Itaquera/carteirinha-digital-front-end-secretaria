import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { RefreshCw, X } from "lucide-react";
import styles from "./PictureInPictureQr.module.css";

export type PipSize = "sm" | "md" | "lg";

export interface PictureInPictureQrProps {
  eventTitle: string;
  checkpointType: "check-in" | "check-out";
  qrValue: string | null;
  secondsRemaining: number;
  qrLoading: boolean;
  qrError: string | null;
  onRefresh: () => void;
  onClose: () => void;
  onSizeChange?: (size: PipSize) => void;
  initialSize?: PipSize;
  isFloating?: boolean;
}

const QR_PIXEL_MAP: Record<PipSize, number> = {
  sm: 180,
  md: 240,
  lg: 300,
};

const CONTAINER_WIDTH_MAP: Record<PipSize, number> = {
  sm: 260,
  md: 320,
  lg: 380,
};

export function PictureInPictureQr({
  eventTitle,
  checkpointType,
  qrValue,
  secondsRemaining,
  qrLoading,
  qrError,
  onRefresh,
  onClose,
  onSizeChange,
  initialSize = "md",
  isFloating = false,
}: PictureInPictureQrProps) {
  const [size, setSize] = useState<PipSize>(initialSize);

  const handleSelectSize = (newSize: PipSize) => {
    setSize(newSize);
    onSizeChange?.(newSize);
  };

  const qrPixelSize = QR_PIXEL_MAP[size];
  const containerWidth = isFloating ? CONTAINER_WIDTH_MAP[size] : "100%";

  return (
    <div
      className={`${styles.pipContainer} ${isFloating ? styles.floatingWidget : ""}`}
      style={isFloating ? { width: `${containerWidth}px` } : undefined}
      data-testid="pip-qr-container"
    >
      {/* Header */}
      <header className={styles.pipHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.liveTagGroup}>
            <span className={styles.liveBadge}>
              <span className={styles.liveDot} />
              AO VIVO
            </span>
            <span className={styles.checkpointBadge}>
              {checkpointType === "check-in" ? "Check-in" : "Check-out"}
            </span>
          </div>
          <h2 className={styles.eventTitle} title={eventTitle}>
            {eventTitle}
          </h2>
        </div>

        <div className={styles.headerControls}>
          <div
            className={styles.sizeSelector}
            role="group"
            aria-label="Controle de tamanho do QR Code"
          >
            <button
              type="button"
              className={`${styles.sizeButton} ${size === "sm" ? styles.sizeButtonActive : ""}`}
              onClick={() => handleSelectSize("sm")}
              title="Tamanho Pequeno (180px)"
              aria-pressed={size === "sm"}
            >
              P
            </button>
            <button
              type="button"
              className={`${styles.sizeButton} ${size === "md" ? styles.sizeButtonActive : ""}`}
              onClick={() => handleSelectSize("md")}
              title="Tamanho Médio (240px - Padrão)"
              aria-pressed={size === "md"}
            >
              M
            </button>
            <button
              type="button"
              className={`${styles.sizeButton} ${size === "lg" ? styles.sizeButtonActive : ""}`}
              onClick={() => handleSelectSize("lg")}
              title="Tamanho Grande (300px)"
              aria-pressed={size === "lg"}
            >
              G
            </button>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            title="Fechar Picture-in-Picture"
            aria-label="Fechar Picture-in-Picture"
          >
            <X size={15} />
          </button>
        </div>
      </header>

      {/* Body / QR Code */}
      <main className={styles.pipBody}>
        {qrValue ? (
          <div className={styles.qrCard}>
            <QRCodeSVG
              value={qrValue}
              size={qrPixelSize}
              level="M"
              bgColor="#ffffff"
              fgColor="#000000"
              includeMargin
              data-testid="pip-attendance-qr"
              role="img"
              aria-label="QR Code de presença em modo Picture-in-Picture"
            />
          </div>
        ) : (
          <div className={styles.loadingCard}>
            <RefreshCw size={32} className={styles.spinning} />
            <span>
              {qrLoading
                ? "Renovando QR Code..."
                : qrError || "Aguardando novo código..."}
            </span>
          </div>
        )}

        {qrError && (
          <div className={styles.errorCard} role="alert">
            <span>{qrError}</span>
          </div>
        )}
      </main>

      {/* Footer / Progress & Hint */}
      <footer className={styles.pipFooter}>
        <div className={styles.timerGroup}>
          <span>Renovação preventiva:</span>
          <span className={styles.timerCountdown}>
            {secondsRemaining}s
          </span>
        </div>

        <div className={styles.progressTrack}>
          <div
            className={styles.progressBar}
            style={{
              width: `${Math.min(100, Math.max(0, (secondsRemaining / 20) * 100))}%`,
            }}
          />
        </div>

        <div className={styles.footerActions}>
          <p className={styles.footerHint}>
            Aponte a câmera do celular para o código
          </p>

          <button
            type="button"
            className={styles.refreshButton}
            onClick={onRefresh}
            disabled={qrLoading}
            title="Forçar renovação imediata do QR Code"
          >
            <RefreshCw size={11} className={qrLoading ? styles.spinning : ""} />
            Renovar
          </button>
        </div>
      </footer>
    </div>
  );
}
