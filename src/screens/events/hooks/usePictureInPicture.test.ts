import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePictureInPicture } from "./usePictureInPicture";
function fakeWindow() { return { document: document.implementation.createHTMLDocument(""), addEventListener: vi.fn(), close: vi.fn(), closed: false } as unknown as Window; }
beforeEach(() => { vi.restoreAllMocks(); delete window.documentPictureInPicture; });
afterEach(() => { delete window.documentPictureInPicture; vi.restoreAllMocks(); });
describe("Janela de projeção", () => {
  it("solicita PiP compacto sem copiar estilos da aplicação", async () => {
    const target = fakeWindow();
    target.document.head.innerHTML = '<link rel="stylesheet" href="/assets/old.css"><style>h2{font-size:50px}</style>';
    const requestWindow = vi.fn().mockResolvedValue(target);
    window.documentPictureInPicture = { requestWindow };
    const { result } = renderHook(() => usePictureInPicture("check-in"));
    await act(async () => { await result.current.openPip(); });
    expect(requestWindow).toHaveBeenCalledWith({ width: 180, height: 200, disallowReturnToOpener: true, preferInitialWindowPlacement: true });
    expect(target.document.querySelectorAll('style,link[rel="stylesheet"]')).toHaveLength(0);
    expect(target.document.body.style.height).toBe("100%");
    expect(result.current.pipWindow).toBe(target);
  });
  it("preserva popup redimensionável quando a API nativa não está disponível", async () => {
    const target = fakeWindow(); const open = vi.spyOn(window, "open").mockReturnValue(target);
    const { result } = renderHook(() => usePictureInPicture("check-in"));
    await act(async () => { await result.current.openPip(); });
    expect(open).toHaveBeenCalledWith("", "FatecAttendanceQrPip", expect.stringContaining("width=180,height=200"));
    expect(result.current.pipWindow).toBe(target);
  });
  it("mantém fallback interno quando popups são bloqueados", async () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    const { result } = renderHook(() => usePictureInPicture("check-in"));
    await act(async () => { await result.current.openPip(); });
    expect(result.current.isFloating).toBe(true);
  });
  it("fecha pela ação da Secretaria", async () => {
    const target = fakeWindow(); vi.spyOn(window, "open").mockReturnValue(target);
    const { result } = renderHook(() => usePictureInPicture("check-in"));
    await act(async () => { await result.current.openPip(); });
    act(() => result.current.closePip());
    expect(target.close).toHaveBeenCalledOnce(); expect(result.current.isPipActive).toBe(false);
  });
  it("encerra a projeção ao fechar o checkpoint", async () => {
    const target = fakeWindow(); vi.spyOn(window, "open").mockReturnValue(target);
    const { result, rerender } = renderHook(({ step }) => usePictureInPicture(step), { initialProps: { step: "check-in" as string | null } });
    await act(async () => { await result.current.openPip(); }); rerender({ step: null });
    expect(target.close).toHaveBeenCalledOnce(); expect(result.current.isPipActive).toBe(false);
  });
  it("limpa a janela externa ao sair da tela", async () => {
    const target = fakeWindow(); vi.spyOn(window, "open").mockReturnValue(target);
    const { result, unmount } = renderHook(() => usePictureInPicture("check-in"));
    await act(async () => { await result.current.openPip(); }); unmount();
    expect(target.close).toHaveBeenCalledOnce();
  });
});
