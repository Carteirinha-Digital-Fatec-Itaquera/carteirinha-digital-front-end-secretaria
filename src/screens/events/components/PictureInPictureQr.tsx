import { useEffect, useRef, useState, type CSSProperties } from "react";
import { QRCodeSVG } from "qrcode.react";
import { PIP_INITIAL_DIMENSIONS } from "../pictureInPictureSizing";

type Props = {
  finalOnly?: boolean;
  eventTitle: string;
  checkpointType: "check-in" | "check-out";
  qrValue: string | null;
  qrLoading: boolean;
  qrError: string | null;
  isFloating?: boolean;
};
const frame: CSSProperties = {
  display: "grid", gridTemplateRows: "minmax(0, 1fr) 20px", width: "100%", height: "100%",
  minWidth: 0, minHeight: 0, margin: 0, padding: 0, border: 0, boxSizing: "border-box",
  overflow: "hidden", background: "#fff", color: "#111", fontFamily: "system-ui, sans-serif",
};
// O PiP recebe estilos próprios no HTML, sem depender do CSS do aplicativo.
export function PictureInPictureQr({ finalOnly = false, eventTitle, checkpointType, qrValue, qrLoading, qrError, isFloating = false }: Props) {
  const area = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState(160);
  useEffect(() => {
    const element = area.current;
    if (!element) return;
    const view = element.ownerDocument.defaultView;
    const Observer = view?.ResizeObserver;
    if (!Observer) return;
    const observer = new Observer(entries => {
      const box = entries[0]?.contentRect;
      if (box) setSide(Math.max(1, Math.floor(Math.min(box.width, box.height))));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const floating: CSSProperties = isFloating ? {
    position: "fixed", right: 12, bottom: 12, zIndex: 9998,
    width: PIP_INITIAL_DIMENSIONS.width, height: PIP_INITIAL_DIMENSIONS.height,
    maxWidth: "calc(100vw - 24px)", maxHeight: "calc(100dvh - 24px)",
    minWidth: 100, minHeight: 120, resize: "both",
  } : {};
  return <div role="region" aria-label={`${eventTitle} — ${checkpointType}`} data-testid="pip-qr-container" style={{ ...frame, ...floating }}>
    <div ref={area} data-testid="pip-qr-area" style={{ minWidth: 0, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", margin: 0, padding: 0, border: 0 }}>
      {qrValue && !qrError ? <QRCodeSVG value={qrValue} size={side} level="M" bgColor="#fff" fgColor="#000" includeMargin
        style={{ display: "block", width: side, height: side, maxWidth: "100%", maxHeight: "100%", flexShrink: 0 }}
        data-testid="pip-attendance-qr" role="img" aria-label="QR Code de presença" />
        : <span role={qrError ? "alert" : "status"} style={{ fontSize: 11, textAlign: "center", color: "#111", padding: 4, overflowWrap: "anywhere" }}>{qrError || (qrLoading ? "Carregando QR Code..." : "Aguardando QR Code...")}</span>}
    </div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 20, margin: 0, padding: 0, border: 0, fontSize: 12, lineHeight: "20px", fontWeight: 700, letterSpacing: "0.03em", color: "#111", background: "#fff", whiteSpace: "nowrap" }}>
      {finalOnly ? "PRESENÇA" : checkpointType === "check-in" ? "CHECK-IN" : "CHECK-OUT"}
    </div>
  </div>;
}
