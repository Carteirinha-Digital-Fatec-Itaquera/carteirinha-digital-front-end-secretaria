import type { Student } from "../../domains/Student";

import { GLOBAL_VAR } from "../config/globalVar"

export async function findById(ra: string): Promise<Student | undefined> {
  const response = await fetch(`${GLOBAL_VAR.BASE_URL}/estudantes/encontrar-por-ra/${ra}`, {
    headers: {
      Authorization: `Bearer ${sessionStorage.getItem('token')}`
    },
    method: 'GET',
  });

  if (!response.ok) {
    console.error(`Algo errado no response: ${response.status}`);
    return undefined;
  }

  return await response.json();
}