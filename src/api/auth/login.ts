import type { Auth } from '../../domains/Auth'

import type { ApiError, Token } from '../../utils/Types'

import { GLOBAL_VAR } from '../config/globalVar'

export async function login(auth: Auth): Promise<Token | ApiError> {
  const response = await fetch(`${GLOBAL_VAR.BASE_URL}/autenticacoes/secretaria/logar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(auth)
  })

  const data = await response.json()

  if (!response.ok) {
    return {
      code: data.code ?? 'UNKNOWN_ERROR',
      status: data.status ?? response.status.toString(),
      message: data.message ?? 'Erro inesperado',
      timestamp: data.timestamp ?? new Date().toISOString(),
      path: data.path ?? '/autenticacoes/secretaria/logar',
      errorFields: data.errorFields ?? null
    };
  }

  return { token: data.token }
}
