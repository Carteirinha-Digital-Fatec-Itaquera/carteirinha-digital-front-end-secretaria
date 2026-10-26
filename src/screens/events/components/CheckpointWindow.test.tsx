import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CheckpointWindow from "./CheckpointWindow";

describe("CheckpointWindow", () => {
  it("explica encerramento manual quando a janela não expira", () => {
    render(<CheckpointWindow isOpen closesAt={null} />);
    expect(screen.getByRole("status")).toHaveTextContent("encerramento manual pela Secretaria");
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  });
});
