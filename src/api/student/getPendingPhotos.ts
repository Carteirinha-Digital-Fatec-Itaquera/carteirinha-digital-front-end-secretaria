import { privateFetch } from '../config/privateFetch';
import { GLOBAL_VAR } from '../config/globalVar';

export async function getPendingPhotos() {
  const response = await privateFetch(`${GLOBAL_VAR.BASE_URL}/secretaria/fotos-pendentes`, {
    method: 'GET',
  });

  if (!response.ok) return [];
  return await response.json();
}