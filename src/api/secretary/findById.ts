import { privateFetch } from '../config/privateFetch';
import { GLOBAL_VAR } from '../config/globalVar';

export async function findSecretaryById(id: number) {
  const response = await privateFetch(`${GLOBAL_VAR.BASE_URL}/secretaria/encontrar-por-id/${id}`, {
    method: 'GET',
  });

  if (!response.ok) {
    console.error(`Erro ao buscar secretaria: ${response.status}`);
    return undefined;
  }

  return await response.json();
}