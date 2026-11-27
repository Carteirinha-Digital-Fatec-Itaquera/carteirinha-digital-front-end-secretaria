import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import EmployeeImport from "./EmployeeImport";
vi.mock("../../components/menuLateral/MenuLateral", () => ({
  default: () => <nav>Menu</nav>,
}));
afterEach(cleanup);
it("importação é apenas preparação visual, sem endpoint ou processamento", () => {
  const fetch = vi.spyOn(globalThis, "fetch");
  render(
    <MemoryRouter initialEntries={["/funcionarios/importar"]}>
      <Routes>
        <Route path="/funcionarios/importar" element={<EmployeeImport />} />
        <Route path="/funcionarios" element={<p>Lista de funcionários</p>} />
      </Routes>
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("heading", { name: "Importar Funcionários" }),
  ).toBeInTheDocument();
  const file = screen.getByLabelText("Selecionar planilha de funcionários");
  expect(file).toBeDisabled();
  expect(file).not.toHaveAttribute("accept");
  expect(
    screen.getByRole("button", { name: "Selecionar planilha" }),
  ).toBeDisabled();
  fireEvent.change(file, {
    target: { files: [new File(["synthetic"], "ficticia.csv")] },
  });
  fireEvent.drop(
    screen.getByRole("region", {
      name: "Importação de funcionários em preparação",
    }),
    { dataTransfer: { files: [] } },
  );
  expect(fetch).not.toHaveBeenCalled();
  expect(
    screen.getByText(
      "A importação de funcionários estará disponível após a definição do modelo oficial da planilha.",
    ),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("link", { name: "Voltar para Funcionários" }),
  );
  expect(screen.getByText("Lista de funcionários")).toBeInTheDocument();
  fetch.mockRestore();
});
