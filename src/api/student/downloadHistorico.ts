import { GLOBAL_VAR } from '../config/globalVar'

export async function downloadHistorico(): Promise<void> {
  const token = sessionStorage.getItem('token')

  const response = await fetch(`${GLOBAL_VAR.BASE_URL}/estudantes/historico-excluidos`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
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