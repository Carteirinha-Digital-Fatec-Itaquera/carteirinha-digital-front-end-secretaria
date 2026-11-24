import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EmployeePhotoQueue from "./EmployeePhotoQueue";
import {
  getEmployeePhotos,
  getEmployeePhotoSummary,
  reviewEmployeePhoto,
} from "../../../api/employee/employeePhotos";
import { ApiRequestError } from "../../../api/config/apiRequest";
vi.mock("../../../api/employee/employeePhotos", () => ({
  getEmployeePhotos: vi.fn(),
  getEmployeePhotoSummary: vi.fn(),
  reviewEmployeePhoto: vi.fn(),
  getEmployeePhotoBlob: vi.fn(),
}));
vi.mock("./EmployeePhotoPreview", () => ({
  default: () => <p>Prévia privada</p>,
}));
const photo = {
  photoId: "photo-one",
  employeeId: "employee-one",
  employeeName: "Pessoa Fictícia",
  displayName: "Pessoa Fictícia",
  registrationNumber: "TESTE-001",
  employeeVersion: 4,
  createdAt: "2026-11-23T12:00:00Z",
  contentUrl: "/privada",
};
const count = vi.fn();
const busy = vi.fn();
const mount = () =>
  render(
    <MemoryRouter>
      <EmployeePhotoQueue onCount={count} onBusy={busy} />
    </MemoryRouter>,
  );
describe("Fila de fotografias dos funcionários", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getEmployeePhotos).mockResolvedValue({
      items: [photo],
      nextCursor: null,
    });
    vi.mocked(getEmployeePhotoSummary).mockResolvedValue({ pendingCount: 1 });
    vi.mocked(reviewEmployeePhoto).mockResolvedValue({});
  });
  afterEach(cleanup);
  it("exibe identidade, usa versão própria e confirma antes de aprovar", async () => {
    mount();
    await screen.findByRole("heading", { name: photo.displayName });
    expect(count).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByRole("button", { name: "Aprovar foto" }));
    const dialog = screen.getByRole("dialog", {
      name: "Aprovar foto do funcionário",
    });
    expect(reviewEmployeePhoto).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(reviewEmployeePhoto).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Aprovar foto" }));
    vi.mocked(getEmployeePhotos).mockResolvedValue({
      items: [],
      nextCursor: null,
    });
    vi.mocked(getEmployeePhotoSummary).mockResolvedValue({ pendingCount: 0 });
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar aprovação" }),
    );
    await screen.findByText("Foto aprovada com sucesso!");
    expect(reviewEmployeePhoto).toHaveBeenCalledWith(
      photo,
      true,
      "",
      expect.any(AbortSignal),
    );
    await screen.findByText(
      "Nenhuma fotografia de funcionário aguardando análise.",
    );
    expect(count).toHaveBeenLastCalledWith(0);
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Atualizar pendências" }),
      ).toHaveFocus(),
    );
  });
  it("exige motivo de rejeição e impede confirmação duplicada", async () => {
    let resolve!: (value: unknown) => void;
    vi.mocked(reviewEmployeePhoto).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    mount();
    fireEvent.click(
      await screen.findByRole("button", { name: "Rejeitar foto" }),
    );
    const form = screen
      .getByRole("button", { name: "Confirmar rejeição" })
      .closest("form")!;
    fireEvent.submit(form);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Informe um motivo",
    );
    expect(reviewEmployeePhoto).not.toHaveBeenCalled();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Motivo da rejeição" }),
      { target: { value: "Rosto fora do quadro." } },
    );
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(reviewEmployeePhoto).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve({});
    });
    expect(
      await screen.findByText("Foto reprovada com sucesso!"),
    ).toBeInTheDocument();
    expect(reviewEmployeePhoto).toHaveBeenCalledWith(
      photo,
      false,
      "Rosto fora do quadro.",
      expect.any(AbortSignal),
    );
  });
  it("recarrega dados após conflito e exige uma nova decisão", async () => {
    vi.mocked(reviewEmployeePhoto).mockRejectedValue(
      new ApiRequestError(409, "Conflito"),
    );
    mount();
    fireEvent.click(
      await screen.findByRole("button", { name: "Aprovar foto" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar aprovação" }),
    );
    await screen.findByText(
      "A solicitação mudou. Confira a fila atualizada e confirme novamente.",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(getEmployeePhotos).toHaveBeenCalledTimes(2);
    expect(reviewEmployeePhoto).toHaveBeenCalledTimes(1);
  });
  it("mantém páginas anteriores e informa falha de rede", async () => {
    vi.mocked(getEmployeePhotos)
      .mockResolvedValueOnce({ items: [photo], nextCursor: "next-cursor" })
      .mockResolvedValueOnce({
        items: [
          { ...photo, photoId: "photo-two", displayName: "Outra Pessoa" },
        ],
        nextCursor: null,
      });
    mount();
    fireEvent.click(
      await screen.findByRole("button", { name: "Carregar mais fotografias" }),
    );
    await screen.findByRole("heading", { name: "Outra Pessoa" });
    expect(
      screen.getByRole("heading", { name: photo.displayName }),
    ).toBeInTheDocument();
    expect(getEmployeePhotos).toHaveBeenLastCalledWith(
      "next-cursor",
      expect.any(AbortSignal),
    );
    vi.mocked(getEmployeePhotos).mockRejectedValue(
      new Error("Rede indisponível"),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Atualizar pendências" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Rede indisponível"),
    );
    expect(count).toHaveBeenLastCalledWith(null);
  });
  it.each([401, 500, 502])(
    "não apresenta sucesso em falha HTTP %s",
    async (status) => {
      vi.mocked(reviewEmployeePhoto).mockRejectedValue(
        new ApiRequestError(status, "Falha simulada"),
      );
      mount();
      fireEvent.click(
        await screen.findByRole("button", { name: "Aprovar foto" }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Confirmar aprovação" }),
      );
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Falha simulada",
      );
      expect(
        screen.queryByText("Foto aprovada com sucesso!"),
      ).not.toBeInTheDocument();
    },
  );
  it("aguarda resposta da API para abrir sucesso", async () => {
    let resolve!: (value: unknown) => void;
    vi.mocked(reviewEmployeePhoto).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    mount();
    fireEvent.click(
      await screen.findByRole("button", { name: "Aprovar foto" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar aprovação" }),
    );
    expect(
      screen.queryByText("Foto aprovada com sucesso!"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvando…" })).toBeDisabled();
    await act(async () => resolve({}));
    expect(
      await screen.findByText("Foto aprovada com sucesso!"),
    ).toBeInTheDocument();
  });
});
