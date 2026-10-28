import type { EventView } from '../../../domains/Event';
export function participantFileTemplate(event: EventView, format: 'json' | 'csv') {
  if (format === 'csv') return '\uFEFFnome_transcrito\r\nPessoa Fictícia Exemplo Um\r\nPessoa Fictícia Exemplo Dois\r\n';
  return JSON.stringify({ versao_formato: '1.0', evento: {
    id_evento_banco: event.id, titulo: event.title,
    data: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(event.startsAt)),
    horario_inicio: new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(event.startsAt)),
  }, participantes: [{ nome_transcrito: 'Pessoa Fictícia Exemplo Um' }, { nome_transcrito: 'Pessoa Fictícia Exemplo Dois' }] }, null, 2);
}
