import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { CertificateItemDialog } from "./CertificateItemDialog";
import { management } from "../../../api/event/publicEventService";
vi.mock("../../../api/event/publicEventService", () => ({
  management: vi.fn(),
  uploadAsset: vi.fn(),
}));
const item = {
  id: "t",
  name: "Modelo selecionado",
  role: "ATTENDEE",
  version: 4,
  status: "PUBLISHED",
  config: {
    heading: "CERTIFICADO",
    edition: "Semana 2026",
    design: "TECHNOLOGY_BLUE_2026_DARK" as const,
  },
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(management).mockResolvedValue({});
  HTMLDialogElement.prototype.showModal = vi.fn(function(this: HTMLDialogElement) { this.setAttribute('open', ''); });
  HTMLDialogElement.prototype.close = vi.fn(function(this: HTMLDialogElement) { this.removeAttribute('open'); });
});
it("edita somente o item acionado com versão e cor", async () => {
  const onSaved = vi.fn(async () => {}),
    onClose = vi.fn();
  render(
    <CertificateItemDialog
      target={{ kind: "templates", item, action: "edit" }}
      onSaved={onSaved}
      onClose={onClose}
    />,
  );
  fireEvent.change(screen.getByLabelText("Nome"), {
    target: { value: "Modelo corrigido" },
  });
  fireEvent.change(screen.getByLabelText("Cor do texto do certificado"), {
    target: { value: "#ffeecc" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Salvar cadastro" }));
  await waitFor(() =>
    expect(management).toHaveBeenCalledWith(
      "templates/t",
      expect.objectContaining({
        name: "Modelo corrigido",
        textColor: "#ffeecc",
        expectedVersion: 4,
      }),
      "PATCH",
    ),
  );
  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(onSaved).toHaveBeenCalled();
  expect(management).toHaveBeenCalledTimes(1);
});
it("exclui somente após confirmação", async () => {
  const onClose = vi.fn();
  render(
    <CertificateItemDialog
      target={{ kind: "templates", item, action: "delete" }}
      onSaved={async () => {}}
      onClose={onClose}
    />,
  );
  expect(management).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
  await waitFor(() =>
    expect(management).toHaveBeenCalledWith(
      "templates/t",
      { expectedVersion: 4 },
      "DELETE",
    ),
  );
});
it("cancelar não exclui", () => {
  const onClose = vi.fn();
  render(
    <CertificateItemDialog
      target={{ kind: "templates", item, action: "delete" }}
      onSaved={async () => {}}
      onClose={onClose}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Cancelar exclusão" }));
  expect(management).not.toHaveBeenCalled();
  expect(onClose).toHaveBeenCalled();
});
