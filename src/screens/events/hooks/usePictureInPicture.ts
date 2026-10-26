import { useCallback, useEffect, useRef, useState } from "react";
import { PIP_INITIAL_DIMENSIONS } from "../pictureInPictureSizing";

// Declaração de tipos para a Web API nativa Document Picture-in-Picture
interface DocumentPictureInPictureOptions {
  width?: number;
  height?: number;
  disallowReturnToOpener?: boolean;
  preferInitialWindowPlacement?: boolean;
}

interface DocumentPictureInPictureAPI {
  requestWindow(options?: DocumentPictureInPictureOptions): Promise<Window>;
  window?: Window;
  onenter?: (event: Event) => void;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPictureAPI;
  }
}

function prepareProjectionDocument(doc: Document) {
  doc.title = "Presença — Fatec Itaquera";
  doc.querySelectorAll('link[rel="stylesheet"], style').forEach(element => element.remove());
  Object.assign(doc.documentElement.style, { width: "100%", height: "100%", margin: "0", padding: "0" });
  Object.assign(doc.body.style, { width: "100%", height: "100%", margin: "0", padding: "0", backgroundColor: "#fff", overflow: "hidden" });
}

export function usePictureInPicture(activeCheckpoint: string | null) {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [isFloating, setIsFloating] = useState(false);
  const [pipError, setPipError] = useState<string | null>(null);
  const pipWindowRef = useRef<Window | null>(null);

  // O conteúdo deixa de aparecer no mesmo render em que o checkpoint encerra.
  if (!activeCheckpoint && (pipWindow !== null || isFloating)) {
    setPipWindow(null);
    setIsFloating(false);
    setPipError(null);
  }
  const isPipActive = pipWindow !== null || isFloating;

  const closePip = useCallback(() => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      try {
        pipWindowRef.current.close();
      } catch {
        // Ignora erros ao fechar janela
      }
    }
    pipWindowRef.current = null;
    setPipWindow(null);
    setIsFloating(false);
    setPipError(null);
  }, []);

  const openPip = useCallback(
    async () => {
      setPipError(null);
      const dims = PIP_INITIAL_DIMENSIONS;

      // 1. Tenta API Nativa Document Picture-in-Picture (Chromium / PWA Edge e Chrome)
      if (typeof window !== "undefined" && window.documentPictureInPicture?.requestWindow) {
        try {
          const pipWin = await window.documentPictureInPicture.requestWindow({
            width: dims.width,
            height: dims.height,
            disallowReturnToOpener: true,
            preferInitialWindowPlacement: true,
          });

          prepareProjectionDocument(pipWin.document);
          const handleClose = () => {
            pipWindowRef.current = null;
            setPipWindow(null);
            setIsFloating(false);
          };

          pipWin.addEventListener("pagehide", handleClose);
          pipWin.addEventListener("unload", handleClose);

          pipWindowRef.current = pipWin;
          setPipWindow(pipWin);
          setIsFloating(false);
          return;
        } catch (err: unknown) {
          console.warn("Document PiP falhou, tentando fallback em popup:", err);
        }
      }

      // 2. Fallback: Mini-Janela Popup Minimalista (window.open)
      try {
        const popupWin = window.open(
          "",
          "FatecAttendanceQrPip",
          `width=${dims.width},height=${dims.height},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
        );

        if (popupWin && !popupWin.closed) {
          prepareProjectionDocument(popupWin.document);

          const handleClose = () => {
            pipWindowRef.current = null;
            setPipWindow(null);
            setIsFloating(false);
          };

          popupWin.addEventListener("pagehide", handleClose);
          popupWin.addEventListener("beforeunload", handleClose);

          pipWindowRef.current = popupWin;
          setPipWindow(popupWin);
          setIsFloating(false);
          return;
        }
      } catch (err: unknown) {
        console.warn("Popup PiP bloqueado pelo navegador, ativando widget flutuante:", err);
      }

      // 3. Fallback Final: Widget Flutuante In-App no Canto da Tela
      setIsFloating(true);
      setPipWindow(null);
    },
    []
  );

  const togglePip = useCallback(
    () => {
      if (isPipActive) {
        closePip();
      } else {
        void openPip();
      }
    },
    [isPipActive, closePip, openPip]
  );

  // Fecha o PiP automaticamente caso o checkpoint seja encerrado.
  useEffect(() => {
    if (!activeCheckpoint && pipWindowRef.current) {
      const opened = pipWindowRef.current;
      pipWindowRef.current = null;
      try { if (!opened.closed) opened.close(); } catch { /* A janela pode já ter sido fechada pelo Windows. */ }
    }
  }, [activeCheckpoint]);

  // Garante limpeza ao desmontar o componente
  useEffect(() => {
    return () => {
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        try {
          pipWindowRef.current.close();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    isPipActive,
    pipWindow,
    isFloating,
    pipError,
    openPip,
    closePip,
    togglePip,
  };
}
