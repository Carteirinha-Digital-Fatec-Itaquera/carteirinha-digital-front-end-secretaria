import { GLOBAL_VAR } from '../config/globalVar';

export async function getPendingPhotos() {
  const token = sessionStorage.getItem('token');
  const response = await fetch(`${GLOBAL_VAR.BASE_URL}/secretaria/fotos-pendentes`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method: 'GET',
  });

  if (!response.ok) return [];
  return await response.json();
}