import type { Secretary } from '../../domains/Secretary'
import type { ApiError, Ok } from '../../utils/Types'
import { GLOBAL_VAR } from '../config/globalVar'

export async function signup(secretary: Secretary): Promise<Ok | ApiError> {
  const response = await fetch(`${GLOBAL_VAR.BASE_URL}/secretaria/criar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(secretary)
  })

  if (!response.ok) {
    const data = await response.json()
    return {
      code: data.code ?? 'UNKNOWN_ERROR',
      status: data.status ?? response.status.toString(),
      message: data.message ?? 'Erro inesperado',
      timestamp: data.timestamp ?? new Date().toISOString(),
      path: data.path ?? '/secretaria/criar',
      errorFields: data.errorFields ?? null
    };
  }

  return { ok: '' }
}

export async function confirmSignup(
  email: string,
  code: string,
  secretary: Secretary
): Promise<Ok | ApiError> {
  const response = await fetch(`${GLOBAL_VAR.BASE_URL}/secretaria/confirmar-cadastro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, secretary })
  })

  if (!response.ok) {
    const data = await response.json()
    return {
      code: data.code ?? 'UNKNOWN_ERROR',
      status: data.status ?? response.status.toString(),
      message: data.message ?? 'Erro inesperado',
      timestamp: data.timestamp ?? new Date().toISOString(),
      path: data.path ?? '/secretaria/confirmar-cadastro',
      errorFields: data.errorFields ?? null
    }
  }

  return { ok: '' }
}