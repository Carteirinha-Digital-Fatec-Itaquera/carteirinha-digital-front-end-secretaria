import { it, expect } from 'vitest';
import { participantFileTemplate } from './participantFileTemplates';
import type { EventView } from '../../../domains/Event';
it('generates examples with the actual event metadata in Brasilia and no student data', () => {
  const event = { id: 'event-id', title: 'Título do evento', startsAt: '2026-10-27T01:00:00Z' } as EventView;
  const json = JSON.parse(participantFileTemplate(event, 'json')) as { evento: { id_evento_banco: string; data: string; horario_inicio: string }; participantes: { nome_transcrito: string }[] };
  expect(json.evento).toMatchObject({ id_evento_banco: 'event-id', data: '2026-10-26', horario_inicio: '22:00' });
  expect(json.participantes).toHaveLength(2);
  expect(participantFileTemplate(event, 'csv')).toContain('nome_transcrito\r\n');
});
