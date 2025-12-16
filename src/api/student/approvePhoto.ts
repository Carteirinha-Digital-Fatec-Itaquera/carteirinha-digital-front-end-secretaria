import { GLOBAL_VAR } from '../config/globalVar';

import { type ApiError, type Ok } from '../../utils/Types';

export async function approvePhoto(id: string, status: boolean): Promise<Ok | ApiError> {
  const token = sessionStorage.getItem('token')
  const response = await fetch(`${GLOBAL_VAR.BASE_URL}/estudantes/aprovar-imagem/${id}/${status}`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    method: 'PATCH',
  });

  if (response.ok) {
    return { ok: '' };
  } else {
    const data = await response.json();
    return {
      code: data.code ?? 'UNKNOWN_ERROR',
      status: data.status ?? response.status.toString(),
      message: data.message ?? 'Erro inesperado',
      timestamp: data.timestamp ?? new Date().toISOString(),
      path: data.path ?? `/estudantes/atualizar/${id}`,
      errorFields: data.errorFields ?? null
    };
  }
}
