import { GLOBAL_VAR } from "../config/globalVar";
import { type ApiError, type Ok } from "../../utils/Types";

export async function deleteByRa(ra: string): Promise<Ok | ApiError> {
  try {
    const response = await fetch(`${GLOBAL_VAR.BASE_URL}/estudantes/deletar/${ra}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
    });

    if (response.status === 204) {
      return { ok: '' };
    } else {
      const data = await response.json();
      return {
        code: data.code ?? 'UNKNOWN_ERROR',
        status: data.status ?? response.status.toString(),
        message: data.message ?? 'Erro inesperado',
        timestamp: data.timestamp ?? new Date().toISOString(),
        path: data.path ?? `/estudantes/deletar/${ra}`,
        errorFields: data.errorFields ?? null
      };
    }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return {
      code: 'NETWORK_ERROR',
      status: '0',
      message: 'Erro de conexão. Verifique sua internet.',
      timestamp: new Date().toISOString(),
      path: `/estudantes/deletar/${ra}`,
      errorFields: null
    };
  }
}
