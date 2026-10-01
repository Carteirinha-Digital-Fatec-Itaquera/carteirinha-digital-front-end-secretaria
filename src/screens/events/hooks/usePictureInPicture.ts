import { useCallback, useEffect, useRef, useState } from "react";
import type { PipSize } from "../components/PictureInPictureQr";

// Declaração de tipos para a Web API nativa Document Picture-in-Picture
interface DocumentPictureInPictureOptions {
  width?: number;
  height?: number;
  disallowReturnToOpener?: boolean;
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

const SIZE_DIMENSIONS: Record<PipSize, { width: number; height: number }> = {
  sm: { width: 290, height: 410 },
  md: { width: 350, height: 480 },
  lg: { width: 420, height: 570 },
};

function copyStylesToDocument(targetDoc: Document) {
  try {
    const styleElements = document.querySelectorAll(
      'link[rel="stylesheet"], style'
    );
    styleElements.forEach((el) => {
      targetDoc.head.appendChild(el.cloneNode(true));
    });
  } catch (err) {
    console.warn("Não foi possível copiar todos os estilos para a janela PiP:", err);
  }
}

export function usePictureInPicture(activeCheckpoint: string | null) {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [isFloating, setIsFloating] = useState(false);
  const [pipError, setPipError] = useState<string | null>(null);
  const pipWindowRef = useRef<Window | null>(null);

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
    async (initialSize: PipSize = "md") => {
      setPipError(null);
      const dims = SIZE_DIMENSIONS[initialSize];

      // 1. Tenta API Nativa Document Picture-in-Picture (Chromium / PWA Edge e Chrome)
      if (typeof window !== "undefined" && window.documentPictureInPicture?.requestWindow) {
        try {
          const pipWin = await window.documentPictureInPicture.requestWindow({
            width: dims.width,
            height: dims.height,
          });

          pipWin.document.title = "QR Code de Presença - Fatec Itaquera";
          pipWin.document.body.style.margin = "0";
          pipWin.document.body.style.padding = "0";
          pipWin.document.body.style.backgroundColor = "#0b1320";
          pipWin.document.body.style.overflow = "hidden";
          pipWin.document.body.style.height = "100vh";

          copyStylesToDocument(pipWin.document);

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
          popupWin.document.title = "QR Code de Presença - Fatec Itaquera";
          popupWin.document.body.style.margin = "0";
          popupWin.document.body.style.padding = "0";
          popupWin.document.body.style.backgroundColor = "#0b1320";
          popupWin.document.body.style.overflow = "hidden";
          popupWin.document.body.style.height = "100vh";

          copyStylesToDocument(popupWin.document);

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
    (initialSize: PipSize = "md") => {
      if (isPipActive) {
        closePip();
      } else {
        void openPip(initialSize);
      }
    },
    [isPipActive, closePip, openPip]
  );

  const handleSizeChange = useCallback((newSize: PipSize) => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      const dims = SIZE_DIMENSIONS[newSize];
      try {
        pipWindowRef.current.resizeTo(dims.width, dims.height);
      } catch {
        // Restrições de segurança de alguns navegadores em resizeTo são silenciosamente ignoradas
      }
    }
  }, []);

  // Fecha o PiP automaticamente caso o checkpoint seja encerrado
  useEffect(() => {
    if (!activeCheckpoint && isPipActive) {
      closePip();
    }
  }, [activeCheckpoint, isPipActive, closePip]);

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
    handleSizeChange,
  };
}
