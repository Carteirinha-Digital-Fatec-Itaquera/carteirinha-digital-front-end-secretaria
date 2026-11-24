import { beforeEach, describe, expect, it, vi } from "vitest";
import { privateFetch } from "../config/privateFetch";
import { GLOBAL_VAR } from "../config/globalVar";
import {
  getEmployeePhotoBlob,
  reviewEmployeePhoto,
  type PendingEmployeePhoto,
} from "./employeePhotos";
import { apiRequest } from "../config/apiRequest";
vi.mock("../config/privateFetch", () => ({ privateFetch: vi.fn() }));
vi.mock("../config/apiRequest", () => ({
  apiRequest: vi.fn(),
  ApiRequestError: class extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));
const item: PendingEmployeePhoto = {
  photoId: "photo-safe",
  employeeId: "employee-safe",
  employeeVersion: 7,
  employeeName: "Fictício",
  displayName: "Fictício",
  registrationNumber: null,
  createdAt: "",
  contentUrl: "https://external.example.test/privada",
};
describe("Contrato das fotos privadas de funcionários", () => {
  beforeEach(() => vi.resetAllMocks());
  it("obtém a prévia somente pela rota própria da API autenticada", async () => {
    vi.mocked(privateFetch).mockResolvedValue(
      new Response("imagem fictícia", {
        status: 200,
        headers: { "content-type": "image/png" },
      }),
    );
    const signal = new AbortController().signal;
    await getEmployeePhotoBlob(item, signal);
    expect(privateFetch).toHaveBeenCalledWith(
      GLOBAL_VAR.BASE_URL.replace(/[/]+$/, "") +
        "/funcionarios/employee-safe/fotos/photo-safe/conteudo",
      { signal },
    );
  });
  it("envia identificadores e versão sem adaptar o funcionário para RA", async () => {
    const signal = new AbortController().signal;
    vi.mocked(apiRequest).mockResolvedValue({
      id: item.employeeId,
      version: 8,
      photo: {
        approvedPhotoId: null,
        pendingPhotoId: null,
        reviewStatus: "REJECTED",
      },
    });
    await reviewEmployeePhoto(item, false, "  Foto desfocada  ", signal);
    expect(apiRequest).toHaveBeenCalledWith(
      "/funcionarios/employee-safe/fotos/photo-safe/avaliacao",
      {
        method: "PATCH",
        signal,
        body: JSON.stringify({
          expectedVersion: 7,
          approved: false,
          reason: "Foto desfocada",
        }),
      },
    );
  });
  it("apresenta sessão expirada e recusa conteúdo que não seja uma imagem", async () => {
    vi.mocked(privateFetch)
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response("{}", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    await expect(
      getEmployeePhotoBlob(item, new AbortController().signal),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      getEmployeePhotoBlob(item, new AbortController().signal),
    ).rejects.toThrow("A resposta não contém uma imagem.");
  });
  it.each([
    undefined,
    {},
    { id: "outra-pessoa", version: 8, photo: {} },
    { id: "employee-safe", version: 7, photo: {} },
  ])("recusa resposta de avaliação inválida: %j", async (result) => {
    vi.mocked(apiRequest).mockResolvedValue(result);
    await expect(
      reviewEmployeePhoto(item, true, "", new AbortController().signal),
    ).rejects.toMatchObject({ status: 502 });
  });
});
