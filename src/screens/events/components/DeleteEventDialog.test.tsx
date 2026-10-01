import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DeleteEventDialog } from "./DeleteEventDialog";

describe("DeleteEventDialog component", () => {
  it("does not render when isOpen is false", () => {
    render(
      <DeleteEventDialog
        isOpen={false}
        eventTitle="Palestra de IA"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders correctly with title and warnings when isOpen is true", () => {
    render(
      <DeleteEventDialog
        isOpen={true}
        eventTitle="Palestra de IA"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Excluir Evento" })).toBeInTheDocument();
    expect(screen.getByText(/"Palestra de IA"/i)).toBeInTheDocument();
    expect(screen.getByText(/ação é irreversível/i)).toBeInTheDocument();
  });

  it("calls onClose when clicking Cancel button or Close icon", () => {
    const handleClose = vi.fn();
    render(
      <DeleteEventDialog
        isOpen={true}
        eventTitle="Palestra de IA"
        onClose={handleClose}
        onConfirm={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it("calls onConfirm and then onClose on successful delete", async () => {
    const handleConfirm = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <DeleteEventDialog
        isOpen={true}
        eventTitle="Palestra de IA"
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    );

    const deleteBtn = screen.getByRole("button", { name: /Excluir Evento/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(handleConfirm).toHaveBeenCalledTimes(1);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });
});
