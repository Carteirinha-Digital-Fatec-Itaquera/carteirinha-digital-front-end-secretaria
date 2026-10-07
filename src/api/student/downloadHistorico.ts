import { privateFetch } from '../config/privateFetch';
import { GLOBAL_VAR } from '../config/globalVar'

export async function downloadHistorico(): Promise<void> {

  const response = await privateFetch(`${GLOBAL_VAR.BASE_URL}/estudantes/historico-excluidos`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('Erro ao baixar histórico')
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'historico-alunos.csv'
  a.click()
  window.URL.revokeObjectURL(url)
}