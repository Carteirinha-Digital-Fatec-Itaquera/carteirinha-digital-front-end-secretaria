import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  act,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EmployeePhotoQueue from "./EmployeePhotoQueue";
import {
  getEmployeePhotos,
  getEmployeePhotoSummary,
  reviewEmployeePhoto,
  type PendingEmployeePhoto,
} from "../../../api/employee/employeePhotos";
import { ApiRequestError } from "../../../api/config/apiRequest";
vi.mock("../../../api/employee/employeePhotos", () => ({
  getEmployeePhotos: vi.fn(),
  getEmployeePhotoSummary: vi.fn(),
  reviewEmployeePhoto: vi.fn(),
  isOptionalPhotoReasonEnabled: () => true,
}));
vi.mock("./EmployeePhotoPreview", () => ({
  default: () => <span>Prévia privada</span>,
}));
const a: PendingEmployeePhoto = {
  employeeId: "employee-a",
  photoId: "photo-a",
  employeeName: "Pessoa A",
  displayName: "Pessoa A",
  registrationNumber: "A",
  employeeVersion: 4,
  createdAt: "2026-11-24T12:00:00Z",
  contentUrl: "/private-a",
};
const b = {
  ...a,
  employeeId: "employee-b",
  photoId: "photo-b",
  displayName: "Pessoa B",
  employeeVersion: 9,
};
const c = {
  ...a,
  employeeId: "employee-c",
  photoId: "photo-c",
  displayName: "Pessoa C",
  employeeVersion: 12,
};
let active: PendingEmployeePhoto[];
const count = vi.fn(),
  busy = vi.fn();
const click = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));
const mount = async () => {
  render(
    <MemoryRouter>
      <EmployeePhotoQueue onCount={count} onBusy={busy} />
    </MemoryRouter>,
  );
  await screen.findByRole("heading", { name: "Pessoa A" });
};
const selected = (value: number) =>
  screen.getByRole("button", {
    name: "Aprovar selecionados (" + value + ")",
  });
describe("Avaliação múltipla de fotografias de funcionários", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    active = [a, b];
    vi.mocked(getEmployeePhotos).mockImplementation((cursor) => {
      const offset = Number(cursor || 0);
      return Promise.resolve({
        items: active.slice(offset, offset + 2),
        nextCursor: offset + 2 < active.length ? String(offset + 2) : null,
      });
    });
    vi.mocked(getEmployeePhotoSummary).mockImplementation(() =>
      Promise.resolve({ pendingCount: active.length }),
    );
    vi.mocked(reviewEmployeePhoto).mockImplementation((photo) => {
      active = active.filter((item) => item.photoId !== photo.photoId);
      return Promise.resolve({});
    });
  });
  afterEach(cleanup);
  it("seleciona individualmente, todos, nenhum e respeita o escopo das páginas carregadas", async () => {
    active = [a, b, c];
    await mount();
    expect(selected(0)).toBeDisabled();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Selecionar foto de Pessoa A" }),
    );
    expect(selected(1)).toBeEnabled();
    click("Selecionar todos");
    expect(selected(2)).toBeEnabled();
    click("Carregar mais fotografias");
    await screen.findByRole("heading", { name: "Pessoa C" });
    expect(selected(2)).toBeEnabled();
    click("Selecionar todos");
    expect(selected(3)).toBeEnabled();
    click("Desselecionar todos");
    expect(selected(0)).toBeDisabled();
  });
  it("reconcilia remoção e versões alteradas ao atualizar todas as páginas carregadas", async () => {
    active = [a, b, c];
    await mount();
    click("Carregar mais fotografias");
    await screen.findByRole("heading", { name: "Pessoa C" });
    click("Selecionar todos");
    click("Atualizar pendências");
    await waitFor(() => expect(selected(3)).toBeEnabled());
    active = [b, { ...c, employeeVersion: 13 }];
    click("Atualizar pendências");
    await waitFor(() => expect(selected(1)).toBeEnabled());
    expect(
      screen.getByRole("checkbox", { name: "Selecionar foto de Pessoa B" }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Selecionar foto de Pessoa C" }),
    ).not.toBeChecked();
  });
  it("aprova somente após confirmação, usa as versões individuais e atualiza contadores", async () => {
    await mount();
    click("Selecionar todos");
    click("Aprovar selecionados (2)");
    expect(
      screen.getByText("2 fotografia(s) selecionada(s)."),
    ).toBeInTheDocument();
    expect(reviewEmployeePhoto).not.toHaveBeenCalled();
    click("Cancelar");
    expect(reviewEmployeePhoto).not.toHaveBeenCalled();
    click("Aprovar selecionados (2)");
    click("Confirmar aprovação");
    await screen.findByText("Fotos aprovadas com sucesso!");
    expect(reviewEmployeePhoto).toHaveBeenNthCalledWith(
      1,
      a,
      true,
      "",
      expect.any(AbortSignal),
    );
    expect(reviewEmployeePhoto).toHaveBeenNthCalledWith(
      2,
      b,
      true,
      "",
      expect.any(AbortSignal),
    );
    expect(count).toHaveBeenLastCalledWith(0);
    click("OK");
    expect(selected(0)).toBeDisabled();
  });
  it.each(["", "  Rosto fora do enquadramento.  "])(
    "reprova em lote com motivo opcional: %j",
    async (reason) => {
      await mount();
      click("Selecionar todos");
      click("Reprovar selecionados (2)");
      const input = screen.getByRole("textbox", {
        name: "Motivo da reprovação (opcional)",
      });
      expect(input).not.toBeRequired();
      fireEvent.change(input, { target: { value: reason } });
      click("Confirmar reprovação");
      await screen.findByText("Fotos reprovadas com sucesso!");
      expect(reviewEmployeePhoto).toHaveBeenCalledTimes(2);
      expect(reviewEmployeePhoto).toHaveBeenNthCalledWith(
        1,
        a,
        false,
        reason,
        expect.any(AbortSignal),
      );
      expect(reviewEmployeePhoto).toHaveBeenNthCalledWith(
        2,
        b,
        false,
        reason,
        expect.any(AbortSignal),
      );
    },
  );
  it("informa falha parcial/409 sem repetir decisões nem manter seleção com versão antiga", async () => {
    vi.mocked(reviewEmployeePhoto)
      .mockImplementationOnce((photo) => {
        active = active.filter((item) => item.photoId !== photo.photoId);
        return Promise.resolve({});
      })
      .mockImplementationOnce(() => {
        active = active.map((item) => ({ ...item, employeeVersion: 10 }));
        return Promise.reject(new ApiRequestError(409, "Alterado"));
      });
    await mount();
    click("Selecionar todos");
    click("Aprovar selecionados (2)");
    click("Confirmar aprovação");
    await screen.findByText(
      "1 avaliação(ões) concluída(s); 1 não concluída(s).",
    );
    expect(
      await screen.findByText(/Pessoa B: Conflito de versão/),
    ).toBeInTheDocument();
    expect(reviewEmployeePhoto).toHaveBeenCalledTimes(2);
    expect(
      screen.queryByText("Fotos aprovadas com sucesso!"),
    ).not.toBeInTheDocument();
    click("OK");
    expect(selected(0)).toBeDisabled();
  });
  it("impede lote duplicado durante o processamento", async () => {
    let release!: (value: unknown) => void;
    vi.mocked(reviewEmployeePhoto).mockImplementationOnce(
      () =>
        new Promise((done) => {
          release = done;
        }),
    );
    await mount();
    click("Selecionar todos");
    click("Aprovar selecionados (2)");
    const form = screen
      .getByRole("button", { name: "Confirmar aprovação" })
      .closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(reviewEmployeePhoto).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Salvando…" })).toBeDisabled();
    await act(async () => release({}));
    await screen.findByText("Fotos aprovadas com sucesso!");
    expect(reviewEmployeePhoto).toHaveBeenCalledTimes(2);
  });
  it.each([401, 403])(
    "interrompe envios restantes quando a sessão/permissão falha: %s",
    async (status) => {
      vi.mocked(reviewEmployeePhoto).mockRejectedValue(
        new ApiRequestError(status, "Sessão encerrada"),
      );
      await mount();
      click("Selecionar todos");
      click("Aprovar selecionados (2)");
      click("Confirmar aprovação");
      await screen.findByText(
        "0 avaliação(ões) concluída(s); 2 não concluída(s).",
      );
      expect(reviewEmployeePhoto).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Pessoa B: Não enviada/)).toBeInTheDocument();
    },
  );
});
