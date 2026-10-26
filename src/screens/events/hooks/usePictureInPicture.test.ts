import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePictureInPicture } from "./usePictureInPicture";

describe("usePictureInPicture Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete (window as unknown as { documentPictureInPicture?: unknown }).documentPictureInPicture;
  });

  it("abre janela nativa Picture-in-Picture quando documentPictureInPicture for suportado", async () => {
    const mockPipWindow = {
      document: {
        title: "",
        body: {
          style: {},
        },
        head: {
          appendChild: vi.fn(),
        },
      },
      addEventListener: vi.fn(),
      close: vi.fn(),
      closed: false,
      resizeTo: vi.fn(),
    } as unknown as Window;

    const requestWindowMock = vi.fn().mockResolvedValue(mockPipWindow);
    (window as unknown as { documentPictureInPicture: { requestWindow: typeof requestWindowMock } }).documentPictureInPicture = {
      requestWindow: requestWindowMock,
    };

    const { result } = renderHook(() => usePictureInPicture("check-in"));

    expect(result.current.isPipActive).toBe(false);

    await act(async () => {
      await result.current.openPip("md");
    });

    expect(requestWindowMock).toHaveBeenCalledWith({ width: 240, height: 272, disallowReturnToOpener: true, preferInitialWindowPlacement: true });
    expect(result.current.isPipActive).toBe(true);
    expect(result.current.pipWindow).toBe(mockPipWindow);
    expect(result.current.isFloating).toBe(false);
  });

  it("utiliza fallback window.open quando documentPictureInPicture não estiver disponível", async () => {
    const mockPopup = {
      document: {
        title: "",
        body: {
          style: {},
        },
        head: {
          appendChild: vi.fn(),
        },
      },
      addEventListener: vi.fn(),
      close: vi.fn(),
      closed: false,
      resizeTo: vi.fn(),
    } as unknown as Window;

    const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(mockPopup);

    const { result } = renderHook(() => usePictureInPicture("check-in"));

    await act(async () => {
      await result.current.openPip("sm");
    });

    expect(windowOpenSpy).toHaveBeenCalledWith(
      "",
      "FatecAttendanceQrPip",
      expect.stringContaining("width=180,height=212")
    );
    expect(result.current.isPipActive).toBe(true);
    expect(result.current.pipWindow).toBe(mockPopup);
    expect(result.current.isFloating).toBe(false);
  });

  it("ativa modo widget flutuante in-app se window.open retornar null (bloqueador de popups)", async () => {
    vi.spyOn(window, "open").mockReturnValue(null);

    const { result } = renderHook(() => usePictureInPicture("check-in"));

    await act(async () => {
      await result.current.openPip("md");
    });

    expect(result.current.isPipActive).toBe(true);
    expect(result.current.pipWindow).toBe(null);
    expect(result.current.isFloating).toBe(true);
  });

  it("fecha o PiP e redefine o estado quando closePip for chamado", async () => {
    const closeMock = vi.fn();
    const mockPopup = {
      document: {
        title: "",
        body: { style: {} },
        head: { appendChild: vi.fn() },
      },
      addEventListener: vi.fn(),
      close: closeMock,
      closed: false,
    } as unknown as Window;

    vi.spyOn(window, "open").mockReturnValue(mockPopup);

    const { result } = renderHook(() => usePictureInPicture("check-in"));

    await act(async () => {
      await result.current.openPip();
    });
    expect(result.current.isPipActive).toBe(true);

    act(() => {
      result.current.closePip();
    });

    expect(closeMock).toHaveBeenCalledTimes(1);
    expect(result.current.isPipActive).toBe(false);
    expect(result.current.pipWindow).toBe(null);
  });

  it("fecha o PiP automaticamente quando activeCheckpoint se tornar null", async () => {
    const closeMock = vi.fn();
    const mockPopup = {
      document: {
        title: "",
        body: { style: {} },
        head: { appendChild: vi.fn() },
      },
      addEventListener: vi.fn(),
      close: closeMock,
      closed: false,
    } as unknown as Window;

    vi.spyOn(window, "open").mockReturnValue(mockPopup);

    const { result, rerender } = renderHook(
      ({ checkpoint }) => usePictureInPicture(checkpoint),
      { initialProps: { checkpoint: "check-in" as string | null } }
    );

    await act(async () => {
      await result.current.openPip();
    });
    expect(result.current.isPipActive).toBe(true);

    // Checkpoint encerra
    rerender({ checkpoint: null });

    expect(closeMock).toHaveBeenCalledTimes(1);
    expect(result.current.isPipActive).toBe(false);
  });
  it("preserva dimensões úteis ao aplicar tamanho incluindo moldura do Windows", async () => {
    const popup = { document: { title: "", body: { style: {} }, head: { appendChild: vi.fn() } }, addEventListener: vi.fn(), close: vi.fn(), closed: false, innerWidth: 180, outerWidth: 198, innerHeight: 212, outerHeight: 255, resizeTo: vi.fn() } as unknown as Window;
    vi.spyOn(window, "open").mockReturnValue(popup);
    const { result } = renderHook(() => usePictureInPicture("check-in"));
    await act(async () => { await result.current.openPip(); });
    act(() => result.current.handleSizeChange("lg"));
    expect(popup.resizeTo).toHaveBeenCalledWith(358, 415);
  });

});
