import { GLOBAL_VAR } from "../config/globalVar";
import { type ApiError, type Ok } from "../../utils/Types";

export async function uploadStudentsFile(file: File): Promise<Ok | ApiError> {
  const token = sessionStorage.getItem("token");
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${GLOBAL_VAR.BASE_URL}/secretaria/upload-alunos`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (response.ok) {
    const data = await response.json();
    return { ok: data };
  } else {
    const error = await response.json();
    return {
      code: error.code ?? "UPLOAD_ERROR",
      status: response.status.toString(),
      message: error.message ?? "Erro ao processar arquivo",
      timestamp: error.timestamp ?? new Date().toISOString(),
      path: error.path ?? "/secretaria/upload-alunos",
      errorFields: error.errorFields ?? null,
    };
  }
}