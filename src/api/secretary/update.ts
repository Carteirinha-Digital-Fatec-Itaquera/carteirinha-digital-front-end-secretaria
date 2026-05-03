import { GLOBAL_VAR } from '../config/globalVar';

export async function updateSecretary(id: number, data: {
  name: string;
  email: string;
  birthDate?: string;
  dueDate: string;
  password?: string;
}) {
  const response = await fetch(`${GLOBAL_VAR.BASE_URL}/secretaria/atualizar/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${sessionStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (response.ok) return { ok: '' };

  const err = await response.json();
  return {
    message: err.message ?? 'Erro ao atualizar',
  };
}