import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PictureInPictureQr } from "./PictureInPictureQr";

describe("PictureInPictureQr Component", () => {
  const defaultProps = {
    eventTitle: "Semana de Tecnologia 2026",
    checkpointType: "check-in" as const,
    qrValue: "https://carteirinha-digital-front-end-aluno.vercel.app/p/validref123",
    secondsRemaining: 18,
    qrLoading: false,
    qrError: null,
    onRefresh: vi.fn(),
    onClose: vi.fn(),
    onSizeChange: vi.fn(),
  };

  it("renderiza o cabeçalho, indicador AO VIVO e título do evento", () => {
    render(<PictureInPictureQr {...defaultProps} />);

    expect(screen.getByText("AO VIVO")).toBeInTheDocument();
    expect(screen.getByText("Check-in")).toBeInTheDocument();
    expect(screen.getByText("Semana de Tecnologia 2026")).toBeInTheDocument();
  });

  it("renderiza o QRCodeSVG quando qrValue está presente", () => {
    render(<PictureInPictureQr {...defaultProps} />);

    const qr = screen.getByTestId("pip-attendance-qr");
    expect(qr).toBeInTheDocument();
    expect(qr).toHaveAttribute("aria-label", "QR Code de presença em modo Picture-in-Picture");
  });

  it("permite alternar entre os tamanhos P, M e G", () => {
    const onSizeChange = vi.fn();
    render(<PictureInPictureQr {...defaultProps} onSizeChange={onSizeChange} />);

    const buttonP = screen.getByRole("button", { name: "P" });
    const buttonM = screen.getByRole("button", { name: "M" });
    const buttonG = screen.getByRole("button", { name: "G" });

    expect(buttonM).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(buttonP);
    expect(buttonP).toHaveAttribute("aria-pressed", "true");
    expect(buttonM).toHaveAttribute("aria-pressed", "false");
    expect(onSizeChange).toHaveBeenCalledWith("sm");

    fireEvent.click(buttonG);
    expect(buttonG).toHaveAttribute("aria-pressed", "true");
    expect(onSizeChange).toHaveBeenCalledWith("lg");
  });

  it("dispara onRefresh ao clicar no botão de renovar", () => {
    const onRefresh = vi.fn();
    render(<PictureInPictureQr {...defaultProps} onRefresh={onRefresh} />);

    const refreshButton = screen.getByRole("button", { name: /Renovar/i });
    fireEvent.click(refreshButton);

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("dispara onClose ao clicar no botão de fechar", () => {
    const onClose = vi.fn();
    render(<PictureInPictureQr {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByRole("button", { name: /Fechar Picture-in-Picture/i });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("exibe estado de carregamento e mensagem de erro quando apropriado", () => {
    render(
      <PictureInPictureQr
        {...defaultProps}
        qrValue={null}
        qrLoading={true}
        qrError="Erro de conexão com o servidor"
      />
    );

    expect(screen.getByText("Renovando QR Code...")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Erro de conexão com o servidor");
  });

  it("renderiza classe flutuante quando isFloating for verdadeiro", () => {
    render(<PictureInPictureQr {...defaultProps} isFloating={true} />);

    const container = screen.getByTestId("pip-qr-container");
    expect(container.className).toContain("floatingWidget");
  });
});
