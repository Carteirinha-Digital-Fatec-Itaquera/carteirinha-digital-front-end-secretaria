import { GLOBAL_VAR } from '../config/globalVar';
import { type ApiError, type Ok } from '../../utils/Types';

export async function removePhoto(ra: string): Promise<Ok | ApiError> {
  const token = sessionStorage.getItem('token');
  const response = await fetch(`${GLOBAL_VAR.BASE_URL}/estudantes/remover-foto/${ra}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.ok) return { ok: '' };

  const data = await response.json();
  return {
    code: data.code ?? 'UNKNOWN_ERROR',
    status: data.status ?? response.status.toString(),
    message: data.message ?? 'Erro inesperado',
    timestamp: data.timestamp ?? new Date().toISOString(),
    path: data.path ?? `/estudantes/remover-foto/${ra}`,
    errorFields: data.errorFields ?? null,
  };
}