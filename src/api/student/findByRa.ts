import type { Student } from "../../domains/Student";

import { GLOBAL_VAR } from "../config/globalVar"

export async function findByRa(ra: string): Promise<Student | undefined> {
  try {
    const response = await fetch(`${GLOBAL_VAR.BASE_URL}/estudantes/encontrar-por-ra/${ra}`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
      },
      method: 'GET',
    })

    if (!response.ok) {
      console.error(`Algo errado no response: ${response.status}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Erro na requisição: ', error);
  }
}