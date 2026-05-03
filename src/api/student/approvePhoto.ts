import { GLOBAL_VAR } from '../config/globalVar';
import { type ApiError, type Ok } from '../../utils/Types';

export async function approvePhoto(ra: string, approved: boolean, rejectionReason?: string): Promise<Ok | ApiError> {
  const token = sessionStorage.getItem('token');
  const response = await fetch(`${GLOBAL_VAR.BASE_URL}/secretaria/aprovar-foto/${ra}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    method: 'PATCH',
    body: JSON.stringify({
      status: approved ? 'APPROVED' : 'REJECTED',
      rejectionReason: rejectionReason ?? null,
    }),
  });

  if (response.ok) return { ok: '' };

  const data = await response.json();
  return {
    code: data.code ?? 'UNKNOWN_ERROR',
    status: data.status ?? response.status.toString(),
    message: data.message ?? 'Erro inesperado',
    timestamp: data.timestamp ?? new Date().toISOString(),
    path: data.path ?? `/secretaria/aprovar-foto/${ra}`,
    errorFields: data.errorFields ?? null,
  };
}