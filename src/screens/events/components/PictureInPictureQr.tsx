import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { RefreshCw, X } from "lucide-react";
import styles from "./PictureInPictureQr.module.css";

import { PIP_DIMENSIONS, type PipSize } from "../pictureInPictureSizing";
export type { PipSize } from "../pictureInPictureSizing";

export interface PictureInPictureQrProps {
  eventTitle: string;
  checkpointType: "check-in" | "check-out";
  qrValue: string | null;
  qrLoading: boolean;
  qrError: string | null;
  onRefresh: () => void;
  onClose: () => void;
  onSizeChange?: (size: PipSize) => void;
  initialSize?: PipSize;
  isFloating?: boolean;
}

export function PictureInPictureQr({
  eventTitle,
  checkpointType,
  qrValue,
  qrLoading,
  qrError,
  onRefresh,
  onClose,
  onSizeChange,
  initialSize = "sm",
  isFloating = false,
}: PictureInPictureQrProps) {
  const [size, setSize] = useState<PipSize>(initialSize);

  const handleSelectSize = (newSize: PipSize) => {
    setSize(newSize);
    onSizeChange?.(newSize);
  };

  const dimensions = PIP_DIMENSIONS[size];

  return (
    <div
      className={`${styles.pipContainer} ${isFloating ? styles.floatingWidget : ""}`}
      style={isFloating ? { width: `${dimensions.width}px`, height: `${dimensions.height}px` } : undefined}
      role="region"
      aria-label={`${eventTitle} — ${checkpointType === "check-in" ? "Check-in" : "Check-out"}`}
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
              title="Janela pequena"
              aria-pressed={size === "sm"}
            >
              P
            </button>
            <button
              type="button"
              className={`${styles.sizeButton} ${size === "md" ? styles.sizeButtonActive : ""}`}
              onClick={() => handleSelectSize("md")}
              title="Janela média"
              aria-pressed={size === "md"}
            >
              M
            </button>
            <button
              type="button"
              className={`${styles.sizeButton} ${size === "lg" ? styles.sizeButtonActive : ""}`}
              onClick={() => handleSelectSize("lg")}
              title="Janela grande"
              aria-pressed={size === "lg"}
            >
              G
            </button>
          </div>

          <button type="button" className={styles.refreshButton} onClick={onRefresh} disabled={qrLoading}
            aria-label="Renovar QR Code" title="Renovar QR Code (invalida o anterior)">
            <RefreshCw size={14} className={qrLoading ? styles.spinning : ""} />
          </button>

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
              size={1024}
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

      {/* A janela controla o tamanho; a margem branca do próprio QR é preservada. */}
      <span className={styles.srOnly}>QR válido até encerramento ou renovação manual. Redimensione pelas bordas da janela.</span>
    </div>
  );
}
