import { GLOBAL_VAR } from "../config/globalVar";

import type { Student } from "../../domains/Student";

import type { ApiError, Ok } from "../../utils/Types";

export async function update(ra: string, student: Student): Promise<Ok | ApiError> {
  try {
    const response = await fetch(`${GLOBAL_VAR.BASE_URL}/estudantes/atualizar/${ra}`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      method: 'PUT',
      body: JSON.stringify(student),
    });

    const data = await response.json();

    if (response.ok) {
      return { ok: '' };
    } else {
      return {
        code: data.code ?? 'UNKNOWN_ERROR',
        status: data.status ?? response.status.toString(),
        message: data.message ?? 'Erro inesperado',
        timestamp: data.timestamp ?? new Date().toISOString(),
        path: data.path ?? `/estudantes/atualizar/${ra}`,
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
      path: `/estudantes/atualizar/${ra}`,
      errorFields: null
    };
  }
};