import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  listEmployees,
  type EmployeeItem,
} from "../../api/employee/employeeService";
import EmployeesList from "./EmployeesList";
vi.mock("../../api/employee/employeeService", () => ({
  listEmployees: vi.fn(),
}));
vi.mock("../../components/menuLateral/MenuLateral", () => ({
  default: () => <nav>Menu</nav>,
}));
vi.mock("./EmployeeApprovedPhoto", () => ({
  default: () => <span>Foto institucional</span>,
}));
const employee: EmployeeItem = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Pessoa Exemplo",
  displayName: "Pessoa Exemplo",
  email: "pessoa@example.test",
  registrationNumber: "FUNC-001",
  accountStatus: "ACTIVE",
  assignmentTitles: ["Docente"],
};
const setup = () =>
  render(
    <MemoryRouter>
      <EmployeesList />
    </MemoryRouter>,
  );
const search = (q: string) => {
  fireEvent.change(
    screen.getByLabelText("Nome, e-mail ou matrícula funcional"),
    { target: { value: q } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Pesquisar" }));
};
beforeEach(() =>
  vi
    .mocked(listEmployees)
    .mockReset()
    .mockResolvedValue({ items: [employee], nextCursor: null }),
);
afterEach(cleanup);
describe("Consulta de funcionários padronizada", () => {
  it("apresenta tabela, situação, dados e ações preservadas", async () => {
    setup();
    await screen.findByRole("link", { name: "Pessoa Exemplo" });
    expect(
      screen.getByRole("columnheader", { name: "Foto" }),
    ).toBeInTheDocument();
    expect(screen.getByText("pessoa@example.test")).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Consultar funcionário Pessoa Exemplo",
      }),
    ).toHaveAttribute("href", "/funcionarios/" + employee.id);
    expect(
      screen.getByRole("link", { name: "Registrar funcionário" }),
    ).toHaveAttribute("href", "/funcionarios/novo");
    expect(
      screen.getByRole("link", { name: "Importar Funcionários" }),
    ).toHaveAttribute("href", "/funcionarios/importar");
  });
  it("mantém a lista durante atualização e não aceita resposta de consulta cancelada", async () => {
    setup();
    await screen.findByRole("link", { name: "Pessoa Exemplo" });
    let first!: (value: { items: EmployeeItem[]; nextCursor: null }) => void;
    vi.mocked(listEmployees).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          first = resolve;
        }),
    );
    search("consulta antiga");
    expect(
      screen.getByRole("link", { name: "Pessoa Exemplo" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Atualizando funcionários…")).toBeInTheDocument();
    const signal = vi.mocked(listEmployees).mock.calls.at(-1)![2]!;
    vi.mocked(listEmployees).mockResolvedValueOnce({
      items: [{ ...employee, displayName: "Resultado atual" }],
      nextCursor: null,
    });
    search("atual");
    await screen.findByRole("link", { name: "Resultado atual" });
    first({
      items: [{ ...employee, displayName: "Resposta tardia" }],
      nextCursor: null,
    });
    await waitFor(() => expect(signal.aborted).toBe(true));
    expect(screen.queryByText("Resposta tardia")).not.toBeInTheDocument();
  });
  it("combina arquivados, pesquisa e cursor sem reutilizar paginação antiga", async () => {
    vi.mocked(listEmployees).mockResolvedValue({
      items: [employee],
      nextCursor: "cursor-ficticio",
    });
    setup();
    fireEvent.click(
      await screen.findByRole("button", { name: "Próxima página" }),
    );
    await waitFor(() =>
      expect(listEmployees).toHaveBeenLastCalledWith(
        "",
        "cursor-ficticio",
        expect.any(AbortSignal),
        false,
      ),
    );
    fireEvent.click(screen.getByLabelText("Mostrar arquivados"));
    await waitFor(() =>
      expect(listEmployees).toHaveBeenLastCalledWith(
        "",
        null,
        expect.any(AbortSignal),
        true,
      ),
    );
    search("FUNC-001");
    await waitFor(() =>
      expect(listEmployees).toHaveBeenLastCalledWith(
        "FUNC-001",
        null,
        expect.any(AbortSignal),
        true,
      ),
    );
  });
  it("diferencia lista vazia de busca sem resultado", async () => {
    vi.mocked(listEmployees).mockResolvedValue({ items: [], nextCursor: null });
    setup();
    await screen.findByText("Nenhum funcionário cadastrado nesta consulta.");
    search("inexistente");
    await screen.findByText(
      "Nenhum funcionário encontrado para esta pesquisa.",
    );
  });
  it("expõe falha sem apagar a consulta anterior e permite recuperação", async () => {
    setup();
    await screen.findByRole("link", { name: "Pessoa Exemplo" });
    vi.mocked(listEmployees).mockRejectedValueOnce(
      new Error("API indisponível"),
    );
    search("outra");
    await screen.findByRole("alert");
    expect(
      screen.getByRole("link", { name: "Pessoa Exemplo" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
  });
});
