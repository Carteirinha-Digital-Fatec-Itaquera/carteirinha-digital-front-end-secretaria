import { privateFetch } from '../config/privateFetch';
import { GLOBAL_VAR } from '../config/globalVar';

import { type ApiError, type Ok } from '../../utils/Types';

import type { Student } from '../../domains/Student';

export async function create(student: Student): Promise<Ok | ApiError> {
  const response = await privateFetch(`${GLOBAL_VAR.BASE_URL}/estudantes/criar`, {
    headers: {

      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: JSON.stringify(student)
  });

  if (response.status === 201) {
    return { ok: '' };
  } else {
    const data = await response.json();

    return {
      code: data.code ?? 'UNKNOWN_ERROR',
      status: data.status ?? response.status.toString(),
      message: data.message ?? 'Erro inesperado',
      timestamp: data.timestamp ?? new Date().toISOString(),
      path: data.path ?? `/estudantes/criar`,
      errorFields: data.errorFields ?? null
    };
  }
}
