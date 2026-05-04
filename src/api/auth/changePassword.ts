import type { ApiError, Ok } from '../../utils/Types'
import { GLOBAL_VAR } from '../config/globalVar'

interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

export async function changePassword(payload: ChangePasswordPayload): Promise<Ok | ApiError> {
  const token = sessionStorage.getItem('token')

  const response = await fetch(`${GLOBAL_VAR.BASE_URL}/autenticacao/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,  // AuthGuard exige o token
    },
    body: JSON.stringify({ newPassword: payload.newPassword }),
  })

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return { ok: 'Senha alterada com sucesso!' }
  }

  const data = await response.json()

  if (!response.ok) {
    return {
      code: data.code ?? 'UNKNOWN_ERROR',
      status: data.status ?? response.status.toString(),
      message: data.message ?? 'Erro inesperado',
      timestamp: data.timestamp ?? new Date().toISOString(),
      path: data.path ?? '/autenticacao/reset-password',
      errorFields: data.errorFields ?? null,
    }
  }

  return { ok: 'Senha alterada com sucesso!' }
}
