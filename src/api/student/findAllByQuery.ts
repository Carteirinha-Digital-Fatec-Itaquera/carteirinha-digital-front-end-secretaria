import { privateFetch } from '../config/privateFetch';
import type { Student } from "../../domains/Student";

import { GLOBAL_VAR } from "../config/globalVar"

export async function findAllByQuery(query: string): Promise<Student[] | undefined> {
  const response = await privateFetch(`${GLOBAL_VAR.BASE_URL}/estudantes/listar-todos?query=${query}`, {
    method: 'GET',
  })

  if (!response.ok) {
    console.error(`Algo errado na requisição: ${response.status}`);
  }

  const data = await response.json();
  return data;
}