import type { AttendanceView } from '../../../domains/Attendance';
export function reusableParticipantList(items: AttendanceView[], eventId: string, format: 'json' | 'csv'): string {
  const seen = new Set<string>();
  const participantes = items.flatMap(item => {
    const key = `${item.studentName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim().replace(/\s+/g, ' ')}:${item.studentRa ? 'aluno' : 'visitante'}`;
    if (seen.has(key)) return []; seen.add(key);
    return [{ nome_transcrito: item.studentName, tipo_participante: item.studentRa ? 'aluno' : 'visitante' }];
  });
  if (format === 'json') return JSON.stringify({ versao_formato: '2.0', tipo_lista: 'nomes_reutilizaveis', origem: { id_evento_banco: eventId }, participantes }, null, 2);
  const cell = (value: string) => '"' + (/^[=+@-]/.test(value) ? "'" + value : value).replace(/"/g, '""') + '"';
  return '\uFEFFnome_transcrito,tipo_participante,origem_evento_id\r\n' + participantes.map(row => [row.nome_transcrito, row.tipo_participante, eventId].map(cell).join(',')).join('\r\n');
}
