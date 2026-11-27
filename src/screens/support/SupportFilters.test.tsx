import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { apiRequest } from "../../api/config/apiRequest";
import SupportScreen from "./SupportScreen";
vi.mock("../../api/config/apiRequest", () => ({ apiRequest: vi.fn() }));
vi.mock("../../components/menuLateral/MenuLateral", () => ({
  default: () => <nav>Menu</nav>,
}));
const statuses = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_STUDENT",
  "RESOLVED",
  "CLOSED",
];
const make = (status: string, index = 0) => ({
  id: status + index,
  subject: "Solicitação " + status + index,
  protocol: "SUP-" + status + index,
  category: "DATA",
  status,
  version: 2,
  unread: false,
  studentName: "Pessoa fictícia",
  studentRa: "123",
  assignedSecretaryId: 1,
  assigneeName: "Secretaria",
  createdAt: "2026-11-01T12:00:00Z",
  eventId: null,
  certificateId: null,
});
let tickets = statuses.map((s) => make(s));
let fail = false,
  paginated = false;
let holdNext: Promise<unknown> | null = null;
beforeEach(() => {
  tickets = statuses.map((s) => make(s));
  fail = false;
  paginated = false;
  holdNext = null;
  vi.mocked(apiRequest)
    .mockReset()
    .mockImplementation(async (path, options) => {
      const url = new URL(path, "http://local.test"),
        p = url.pathname;
      if (p.endsWith("/assignees")) return [{ id: 1, name: "Secretaria" }];
      if (p.endsWith("/audit")) return [];
      if (p.endsWith("/read")) return { success: true };
      if (p === "/support/admin/tickets") {
        if (fail) throw Error("API indisponível");
        if (url.searchParams.get("cursor") && holdNext) return holdNext;
        const status = url.searchParams.get("status");
        const q = url.searchParams.get("q")?.toLowerCase();
        let rows = tickets.filter(
          (t) =>
            (!status || t.status === status) &&
            (!q || t.subject.toLowerCase().includes(q)),
        );
        if (paginated && status === "OPEN")
          rows = url.searchParams.has("cursor")
            ? [make("OPEN", 1)]
            : [make("OPEN", 0)];
        return {
          items: rows,
          nextCursor:
            paginated && !url.searchParams.has("cursor") ? "next-page" : null,
        };
      }
      const id = p.split("/")[4];
      const ticket = tickets.find((t) => t.id === id)!;
      if (p.endsWith("/status")) {
        const body = JSON.parse(String(options?.body));
        ticket.status = body.status;
        ticket.version++;
        return { success: true };
      }
      return {
        ticket,
        viewerSecretaryId: 1,
        messages: [],
        messageNextCursor: null,
      };
    });
});
afterEach(cleanup);
const setup = (path = "/suporte") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/suporte" element={<SupportScreen />} />
        <Route path="/suporte/:id" element={<SupportScreen />} />
      </Routes>
    </MemoryRouter>,
  );
const listCalls = () =>
  vi
    .mocked(apiRequest)
    .mock.calls.filter(([p]) => p.startsWith("/support/admin/tickets?"));
const lastQuery = () =>
  new URL(listCalls().at(-1)![0], "http://local.test").searchParams;
describe("Filtros reais de suporte", () => {
  it("inicia em OPEN sem depender de um submit e expõe somente estados reais", async () => {
    setup();
    await screen.findByRole("heading", { name: "Solicitação OPEN0" });
    expect(screen.getByLabelText("Situação")).toHaveValue("OPEN");
    expect(lastQuery().get("status")).toBe("OPEN");
    expect(
      Array.from(
        (screen.getByLabelText("Situação") as HTMLSelectElement).options,
      ).map((o) => o.value),
    ).toEqual(["", ...statuses]);
    expect(
      screen.queryByRole("heading", { name: "Solicitação CLOSED0" }),
    ).not.toBeInTheDocument();
  });
  it.each(statuses)(
    "aplica %s imediatamente e preserva o filtro na consulta",
    async (status) => {
      setup();
      await screen.findByRole("heading", { name: "Solicitação OPEN0" });
      fireEvent.change(screen.getByLabelText("Situação"), {
        target: { value: status },
      });
      await screen.findByRole("heading", {
        name: "Solicitação " + status + "0",
      });
      expect(lastQuery().get("status")).toBe(status);
      expect(screen.getByLabelText("Situação")).toHaveValue(status);
    },
  );
  it("Todos remove o status da API e limpar retorna a Em aberto", async () => {
    setup();
    await screen.findByRole("heading", { name: "Solicitação OPEN0" });
    fireEvent.change(screen.getByLabelText("Situação"), {
      target: { value: "" },
    });
    await screen.findByRole("heading", { name: "Solicitação CLOSED0" });
    expect(lastQuery().has("status")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    await waitFor(() => expect(lastQuery().get("status")).toBe("OPEN"));
    expect(screen.getByLabelText("Situação")).toHaveValue("OPEN");
  });
  it("combina busca, paginação e mudança de estado, descartando resposta tardia", async () => {
    paginated = true;
    setup();
    await screen.findByRole("heading", { name: "Solicitação OPEN0" });
    let finish!: (value: unknown) => void;
    holdNext = new Promise((resolve) => {
      finish = resolve;
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Carregar mais solicitações" }),
    );
    await waitFor(() => expect(lastQuery().get("cursor")).toBe("next-page"));
    fireEvent.change(screen.getByLabelText("Situação"), {
      target: { value: "IN_PROGRESS" },
    });
    await screen.findByRole("heading", { name: "Solicitação IN_PROGRESS0" });
    await act(async () =>
      finish({ items: [make("OPEN", 1)], nextCursor: null }),
    );
    expect(
      screen.queryByRole("heading", { name: "Solicitação OPEN1" }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nome, RA, protocolo ou assunto"), {
      target: { value: "IN_PROGRESS" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Buscar solicitações" }),
    );
    await waitFor(() => expect(lastQuery().get("q")).toBe("IN_PROGRESS"));
    expect(lastQuery().get("status")).toBe("IN_PROGRESS");
    expect(lastQuery().has("cursor")).toBe(false);
  });
  it("lista vazia e erro de outro filtro não apresentam resultados antigos como atuais", async () => {
    setup();
    await screen.findByRole("heading", { name: "Solicitação OPEN0" });
    fail = true;
    fireEvent.change(screen.getByLabelText("Situação"), {
      target: { value: "CLOSED" },
    });
    await screen.findByRole("alert");
    expect(
      screen.queryByRole("heading", { name: "Solicitação OPEN0" }),
    ).not.toBeInTheDocument();
    fail = false;
    tickets = [];
    fireEvent.click(
      screen.getByRole("button", { name: "Atualizar atendimento" }),
    );
    await screen.findByRole("heading", {
      name: "Nenhuma solicitação encontrada",
    });
  });
  it("resolvido sai de OPEN após atualizar e a resposta é enviada somente ao confirmar", async () => {
    setup();
    await screen.findByRole("heading", { name: "Solicitação OPEN0" });
    fireEvent.click(screen.getByRole("link", { name: /Ver atendimento/ }));
    await screen.findByLabelText("Resposta ao aluno");
    fireEvent.change(screen.getByLabelText("Resposta ao aluno"), {
      target: { value: "Orientação fictícia preservada na atualização." },
    });
    fireEvent.click(
      screen.getByLabelText(
        "Confirmei a correção ou a orientação no fluxo adequado.",
      ),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Marcar como resolvido e avisar o aluno",
      }),
    );
    await screen.findByRole("dialog", { name: "Alteração salva" });
    const change = vi
      .mocked(apiRequest)
      .mock.calls.find(([p]) => p.endsWith("/status"))!;
    expect(JSON.parse(String(change[1]?.body))).toMatchObject({
      status: "RESOLVED",
      confirmed: true,
      message: "Orientação fictícia preservada na atualização.",
      expectedVersion: 2,
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("link", { name: "Voltar à fila" }));
    await screen.findByRole("heading", {
      name: "Nenhuma solicitação encontrada",
    });
    expect(screen.getByLabelText("Situação")).toHaveValue("OPEN");
  });
  it("estado não contratual na URL não cria filtro de API fictício", async () => {
    setup("/suporte?status=toString");
    await screen.findByRole("heading", { name: "Solicitação OPEN0" });
    expect(lastQuery().get("status")).toBe("OPEN");
  });
});
