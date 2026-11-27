import { apiRequest, ApiRequestError } from "../config/apiRequest";
import { privateFetch } from "../config/privateFetch";
import { GLOBAL_VAR } from "../config/globalVar";

export const isOptionalPhotoReasonEnabled = () =>
  import.meta.env.VITE_EMPLOYEE_PHOTO_OPTIONAL_REASON === "true";

export interface PendingEmployeePhoto {
  photoId: string;
  employeeId: string;
  employeeName: string;
  displayName: string;
  registrationNumber: string | null;
  employeeVersion: number;
  createdAt: string;
  contentUrl: string;
}
export interface EmployeePhotoPage {
  items: PendingEmployeePhoto[];
  nextCursor: string | null;
}
export function getEmployeePhotoSummary(signal?: AbortSignal) {
  return apiRequest<{ pendingCount: number }>("/funcionarios/fotos/resumo", {
    signal,
  });
}
export function getEmployeePhotos(cursor: string | null, signal?: AbortSignal) {
  const query = new URLSearchParams({ limit: "25" });
  if (cursor) query.set("cursor", cursor);
  return apiRequest<EmployeePhotoPage>(
    "/funcionarios/fotos/pendentes?" + query,
    { signal },
  );
}
export async function reviewEmployeePhoto(
  photo: PendingEmployeePhoto,
  approved: boolean,
  reason: string,
  signal: AbortSignal,
): Promise<unknown> {
  if (!approved && !reason.trim() && !isOptionalPhotoReasonEnabled()) {
    throw new ApiRequestError(
      503,
      "Envio sem motivo temporariamente indisponível. Informe um motivo ou tente novamente mais tarde.",
    );
  }
  const result = await apiRequest<unknown>(
    "/funcionarios/" +
      encodeURIComponent(photo.employeeId) +
      "/fotos/" +
      encodeURIComponent(photo.photoId) +
      "/avaliacao",
    {
      method: "PATCH",
      signal,
      body: JSON.stringify({
        expectedVersion: photo.employeeVersion,
        approved,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      }),
    },
  );
  if (
    !result ||
    typeof result !== "object" ||
    !("id" in result) ||
    result.id !== photo.employeeId ||
    !("version" in result) ||
    result.version !== photo.employeeVersion + 1 ||
    !("photo" in result) ||
    !result.photo ||
    typeof result.photo !== "object" ||
    Array.isArray(result.photo) ||
    !("approvedPhotoId" in result.photo) ||
    !("pendingPhotoId" in result.photo) ||
    !("reviewStatus" in result.photo) ||
    (approved
      ? result.photo.approvedPhotoId !== photo.photoId
      : result.photo.pendingPhotoId === photo.photoId)
  ) {
    throw new ApiRequestError(
      502,
      "A API retornou uma resposta inválida. Atualize a fila para conferir o resultado antes de avaliar novamente.",
    );
  }
  return result;
}
export async function getEmployeePhotoBlob(
  photo: Pick<PendingEmployeePhoto, "employeeId" | "photoId">,
  signal: AbortSignal,
) {
  // Derive the private same-API path from identifiers. Never forward a bearer to a supplied contentUrl.
  const path =
    "/funcionarios/" +
    encodeURIComponent(photo.employeeId) +
    "/fotos/" +
    encodeURIComponent(photo.photoId) +
    "/conteudo";
  const response = await privateFetch(
    GLOBAL_VAR.BASE_URL.replace(/[/]+$/, "") + path,
    { signal },
  );
  if (!response.ok)
    throw new ApiRequestError(
      response.status,
      response.status === 401
        ? "Sessão expirada."
        : "Não foi possível carregar a foto privada.",
    );
  const blob = await response.blob();
  if (!blob.type.startsWith("image/"))
    throw new Error("A resposta não contém uma imagem.");
  return blob;
}
