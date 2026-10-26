import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PictureInPictureQr } from "./PictureInPictureQr";
const props = { eventTitle: "Atividade teste", checkpointType: "check-in" as const, qrValue: "https://carteirinha-digital-front-end-aluno.vercel.app/p/test_reference_1234567", qrLoading: false, qrError: null };
afterEach(() => vi.unstubAllGlobals());
describe("Projeção mínima do QR", () => {
  it("mostra somente QR e legenda, com estilos próprios", () => {
    render(<PictureInPictureQr {...props} />);
    expect(screen.getByText("CHECK-IN")).toBeInTheDocument();
    expect(screen.getByTestId("pip-attendance-qr")).toBeInTheDocument();
    expect(screen.queryByText(props.eventTitle)).not.toBeInTheDocument();
    expect(screen.queryByText("AO VIVO")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByTestId("pip-qr-container")).toHaveStyle({ display: "grid", background: "#fff" });
  });
  it("atualiza a legenda ao mudar de etapa", () => {
    const { rerender } = render(<PictureInPictureQr {...props} />);
    rerender(<PictureInPictureQr {...props} checkpointType="check-out" />);
    expect(screen.getByText("CHECK-OUT")).toBeInTheDocument();
    expect(screen.queryByText("CHECK-IN")).not.toBeInTheDocument();
  });
  it("mede o menor espaço disponível e mantém QR quadrado", () => {
    let notify!: ResizeObserverCallback;
    const disconnect = vi.fn();
    vi.stubGlobal("ResizeObserver", class { constructor(callback: ResizeObserverCallback) { notify = callback; } observe() {} disconnect = disconnect; });
    const { unmount } = render(<PictureInPictureQr {...props} />);
    const resize = (width: number, height: number) => act(() => notify([{ contentRect: { width, height } } as ResizeObserverEntry], {} as ResizeObserver));
    resize(400, 120);
    expect(screen.getByTestId("pip-attendance-qr")).toHaveAttribute("width", "120");
    expect(screen.getByTestId("pip-attendance-qr")).toHaveAttribute("height", "120");
    resize(90, 300);
    expect(screen.getByTestId("pip-attendance-qr")).toHaveAttribute("width", "90");
    unmount(); expect(disconnect).toHaveBeenCalledOnce();
  });
  it("mostra estados de carregamento e falha sem QR antigo", () => {
    const { rerender } = render(<PictureInPictureQr {...props} qrValue={null} qrLoading />);
    expect(screen.getByRole("status")).toHaveTextContent("Carregando");
    rerender(<PictureInPictureQr {...props} qrError="Falha ao obter QR" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Falha ao obter QR");
    expect(screen.queryByTestId("pip-attendance-qr")).not.toBeInTheDocument();
  });
  it("o fallback pode ser redimensionado sem moldura do aplicativo", () => {
    render(<PictureInPictureQr {...props} isFloating />);
    expect(screen.getByTestId("pip-qr-container")).toHaveStyle({ resize: "both", width: "180px", height: "200px" });
  });
});
