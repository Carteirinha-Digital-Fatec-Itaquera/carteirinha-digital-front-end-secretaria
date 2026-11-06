import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import SupportScreen from "./SupportScreen";
import { apiRequest } from "../../api/config/apiRequest";
vi.mock("../../api/config/apiRequest", () => ({ apiRequest: vi.fn() }));
vi.mock("../../components/menuLateral/MenuLateral", () => ({
  default: () => <nav>Menu administrativo</nav>,
}));
const ticket = {
  id: "ticket",
  protocol: "SUP-TESTE",
  subject: "Conferir cadastro",
  category: "DATA",
  status: "IN_PROGRESS",
  version: 2,
  assignedSecretaryId: 1,
  studentName: "Nome de uso",
  studentRa: "123",
  assigneeName: "Secretaria",
  createdAt: "2026-10-28T10:00:00Z",
  proposedValue: "<script>teste</script>",
};
describe("Atendimento de suporte", () => {
  beforeEach(() => {
    vi.mocked(apiRequest)
      .mockReset()
      .mockImplementation(async (path) => {
        if (path.endsWith("/assignees")) return [{ id: 1, name: "Secretaria" }];
        if (path.endsWith("/audit")) return [];
        if (path.endsWith("/read")) return { success: true };
        return {
          ticket,
          viewerSecretaryId: 1,
          messages: [
            {
              id: "message",
              authorRole: "STUDENT",
              body: "<img src=x onerror=alert(1)>",
              createdAt: ticket.createdAt,
            },
          ],
          messageNextCursor: null,
        };
      });
  });
  afterEach(cleanup);
  const setup = () =>
    render(
      <MemoryRouter initialEntries={["/suporte/ticket"]}>
        <Routes>
          <Route path="/suporte/:id" element={<SupportScreen />} />
        </Routes>
      </MemoryRouter>,
    );
  it("escapes message text and requires explicit confirmation plus a response to resolve", async () => {
    setup();
    await screen.findByText("<img src=x onerror=alert(1)>");
    expect(document.querySelector("img")).toBeNull();
    const resolve = screen.getByRole("button", {
      name: "Marcar como resolvido e avisar o aluno",
    });
    expect(resolve).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Resposta ao aluno"), {
      target: { value: "Informação conferida no cadastro." },
    });
    expect(resolve).toBeDisabled();
    fireEvent.click(
      screen.getByLabelText(
        "Confirmei a correção ou a orientação no fluxo adequado.",
      ),
    );
    fireEvent.click(resolve);
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith(
        "/support/admin/tickets/ticket/status",
        expect.objectContaining({
          body: expect.stringContaining('"confirmed":true'),
        }),
      ),
    );
  });
  it("keeps the written reply when a concurrent update rejects it", async () => {
    setup();
    await screen.findByRole("heading", { name: "Conferir cadastro" });
    vi.mocked(apiRequest).mockImplementation(async (path) => {
      if (path.endsWith("/messages"))
        throw new Error("Solicitação alterada. Atualize antes de continuar.");
      return {};
    });
    fireEvent.change(screen.getByLabelText("Resposta ao aluno"), {
      target: { value: "Resposta importante para preservar." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar resposta" }));
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Resposta ao aluno")).toHaveValue(
      "Resposta importante para preservar.",
    );
  });
  it("requires a reason and confirmation before cancelling an assigned request", async () => {
    setup();
    await screen.findByRole("heading", { name: "Conferir cadastro" });
    fireEvent.click(screen.getByText("Outras ações"));
    const cancel = screen.getByRole("button", { name: "Cancelar solicitação" });
    expect(cancel).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Motivo para cancelar ou excluir"), {
      target: { value: "Solicitação duplicada conferida." },
    });
    fireEvent.click(cancel);
    expect(
      screen.getByRole("dialog", { name: "Cancelar solicitação?" }),
    ).toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalledWith(
      "/support/admin/tickets/ticket/cancel",
      expect.anything(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar cancelamento" }),
    );
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith(
        "/support/admin/tickets/ticket/cancel",
        expect.objectContaining({
          body: expect.stringContaining('"confirmed":true'),
        }),
      ),
    );
  });
  it("does not delete when the operator dismisses confirmation", async () => {
    setup();
    await screen.findByRole("heading", { name: "Conferir cadastro" });
    fireEvent.click(screen.getByText("Outras ações"));
    fireEvent.change(screen.getByLabelText("Motivo para cancelar ou excluir"), {
      target: { value: "Registro duplicado." },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Excluir solicitação" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Excluir solicitação?" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(apiRequest).not.toHaveBeenCalledWith(
      "/support/admin/tickets/ticket/delete",
      expect.anything(),
    );
  });
  it("preserves filters when returning from details and supports clearing them", async () => {
    const original = vi.mocked(apiRequest).getMockImplementation()!;
    vi.mocked(apiRequest).mockImplementation(async (path, options) =>
      path.startsWith("/support/admin/tickets?")
        ? { items: [ticket], nextCursor: null }
        : original(path, options),
    );
    render(
      <MemoryRouter initialEntries={["/suporte?q=Nome&status=IN_PROGRESS"]}>
        <Routes>
          <Route path="/suporte" element={<SupportScreen />} />
          <Route path="/suporte/:id" element={<SupportScreen />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByRole("link", { name: /Ver atendimento/ });
    expect(screen.getByLabelText("Nome, RA, protocolo ou assunto")).toHaveValue(
      "Nome",
    );
    fireEvent.click(screen.getByRole("link", { name: /Ver atendimento/ }));
    await screen.findByRole("heading", { name: "Conferir cadastro" });
    fireEvent.click(screen.getByRole("link", { name: "Voltar à fila" }));
    await screen.findByRole("link", { name: /Ver atendimento/ });
    expect(screen.getByLabelText("Situação")).toHaveValue("IN_PROGRESS");
    expect(screen.getByLabelText("Nome, RA, protocolo ou assunto")).toHaveValue(
      "Nome",
    );
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    await waitFor(() =>
      expect(
        screen.getByLabelText("Nome, RA, protocolo ou assunto"),
      ).toHaveValue(""),
    );
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith(
        "/support/admin/tickets?",
        expect.anything(),
      ),
    );
  });
  it("blocks duplicate responses and only shows success after the API resolves", async () => {
    setup();
    await screen.findByRole("heading", { name: "Conferir cadastro" });
    const original = vi.mocked(apiRequest).getMockImplementation()!;
    let finish!: (value: unknown) => void;
    vi.mocked(apiRequest).mockImplementation((path, options) =>
      path.endsWith("/messages")
        ? new Promise((resolve) => {
            finish = resolve;
          })
        : original(path, options),
    );
    fireEvent.change(screen.getByLabelText("Resposta ao aluno"), {
      target: { value: "Conferimos a informação solicitada." },
    });
    const send = screen.getByRole("button", { name: "Enviar resposta" });
    fireEvent.click(send);
    fireEvent.click(send);
    expect(send).toBeDisabled();
    expect(
      screen.queryByRole("dialog", { name: "Alteração salva" }),
    ).toBeNull();
    expect(
      vi
        .mocked(apiRequest)
        .mock.calls.filter(([path]) => path.endsWith("/messages")),
    ).toHaveLength(1);
    finish({ success: true });
    await screen.findByRole("dialog", { name: "Alteração salva" });
    expect(screen.getByText("Resposta enviada ao aluno.")).toBeInTheDocument();
  });
  it("keeps reassign and sensitive-content reasons separate from a draft response", async () => {
    setup();
    await screen.findByRole("heading", { name: "Conferir cadastro" });
    fireEvent.change(screen.getByLabelText("Resposta ao aluno"), {
      target: { value: "Rascunho para o aluno." },
    });
    fireEvent.click(screen.getByText("Reatribuir atendimento"));
    fireEvent.change(screen.getByLabelText("Justificativa da reatribuição"), {
      target: { value: "Responsável especializado." },
    });
    fireEvent.click(screen.getByText("Opções da mensagem"));
    fireEvent.click(
      screen.getByRole("button", {
        name: "Remover conteúdo sensível desta mensagem",
      }),
    );
    fireEvent.change(screen.getByLabelText("Justificativa", { exact: true }), {
      target: { value: "Documento pessoal informado." },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar remoção do conteúdo" }),
    );
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith(
        "/support/admin/tickets/ticket/messages/message/redact",
        expect.anything(),
      ),
    );
    const call = vi
      .mocked(apiRequest)
      .mock.calls.find(([path]) => path.endsWith("/redact"))!;
    const body = JSON.parse(String(call[1]?.body));
    expect(body.reason).toBe("Documento pessoal informado.");
    expect(body.message).toBeUndefined();
    expect(screen.getByLabelText("Resposta ao aluno")).toHaveValue(
      "Rascunho para o aluno.",
    );
  });
  it("claims unassigned tickets and preserves the reassignment contract", async () => {
    const original = vi.mocked(apiRequest).getMockImplementation()!;
    vi.mocked(apiRequest).mockImplementation(async (path, options) =>
      path === "/support/admin/tickets/ticket"
        ? {
            ticket: {
              ...ticket,
              assignedSecretaryId: null,
              assigneeName: null,
            },
            viewerSecretaryId: 1,
            messages: [],
            messageNextCursor: null,
          }
        : original(path, options),
    );
    setup();
    fireEvent.click(
      await screen.findByRole("button", { name: "Assumir atendimento" }),
    );
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith(
        "/support/admin/tickets/ticket/claim",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByText("Reatribuir atendimento"));
    fireEvent.change(screen.getByLabelText("Novo responsável"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Justificativa da reatribuição"), {
      target: { value: "Encaminhado ao responsável." },
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Reatribuir com justificativa" }),
      ).toBeEnabled(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Reatribuir com justificativa" }),
    );
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith(
        "/support/admin/tickets/ticket/assignee",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining('"assigneeId":1'),
        }),
      ),
    );
  });
  it("preserves the waiting-student transition and the resolution safeguards", async () => {
    setup();
    await screen.findByRole("heading", { name: "Conferir cadastro" });
    fireEvent.change(screen.getByLabelText("Resposta ao aluno"), {
      target: { value: "Por favor, detalhe o problema." },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Solicitar informação ao aluno" }),
    );
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith(
        "/support/admin/tickets/ticket/status",
        expect.objectContaining({
          body: expect.stringContaining('"status":"WAITING_STUDENT"'),
        }),
      ),
    );
  });
});
