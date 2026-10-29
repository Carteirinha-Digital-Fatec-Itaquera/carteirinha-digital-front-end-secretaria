import { describe, it, expect } from 'vitest';
import { reusableParticipantList } from './reusableParticipantList';
import { exportDraft, type ParticipantDraft } from './participantDraftStore';
import { readParticipantDraftFile } from './participantDraftFile';
import type { AttendanceView } from '../../../domains/Attendance';
import type { EventView } from '../../../domains/Event';
const target = { id: 'other-event', title: 'Outra palestra', startsAt: '2026-10-27T12:00:00Z' } as EventView;
const file = (text: string, name: string) => ({ name, size: new TextEncoder().encode(text).length, arrayBuffer: async () => new TextEncoder().encode(text).buffer }) as File;
const rows = [{ studentName: 'Ágata Teste', studentRa: '123' }, { studentName: 'Agata Teste', studentRa: '123' }, { studentName: 'Visitante Teste', studentRa: '' }] as AttendanceView[];
describe('listas reutilizáveis entre palestras', () => {
 it.each(['csv', 'json'] as const)('roundtrips %s from event A to event B, deduplicates and preserves visitor review', async format => {
  const exported = reusableParticipantList(rows, 'source-event', format);
  const imported = await readParticipantDraftFile(file(exported, `names.${format}`), target);
  expect(imported).toEqual([{ rawName: 'Ágata Teste', sourceType: 'aluno', sourceEventId: 'source-event', review: false }, { rawName: 'Visitante Teste', sourceType: 'visitante', sourceEventId: 'source-event', review: true }]);
  expect(exported).not.toContain('123');
  expect(imported.every(row => !('selected' in row) && !('accountId' in row) && !('operationId' in row))).toBe(true);
 });
 it('rejects reusable JSON with a hidden target and retains legacy event isolation', async () => {
  const value = JSON.parse(reusableParticipantList(rows, 'source', 'json'));
  value.evento = { id_evento_banco: target.id };
  await expect(readParticipantDraftFile(file(JSON.stringify(value), 'a.json'), target)).rejects.toThrow('destino');
  await expect(readParticipantDraftFile(file(JSON.stringify({ versao_formato: '1.0', evento: { id_evento_banco: 'source' }, participantes: ['Nome Teste'] }), 'old.json'), target)).rejects.toThrow('outro evento');
 });
 it('escapes formulas in CSV and rejects unknown participant type', async () => {
  expect(reusableParticipantList([{ studentName: '=Nome', studentRa: 'ra' }] as AttendanceView[], 'a', 'csv')).toContain("'=Nome");
  await expect(readParticipantDraftFile(file('nome_transcrito,tipo_participante\nNome Teste,admin', 'a.csv'), target)).rejects.toThrow('Tipo');
 });
 it.each(['csv', 'json'] as const)('preserves visitor review and declared origin in draft backup %s', async format => {
  const draft = { eventId: target.id, eventSnapshot: { title: target.title, startsAt: target.startsAt }, rows: [{ rawName: 'Visitante Teste', sourceType: 'visitante', sourceEventId: 'source-event', review: true }] } as ParticipantDraft;
  const restored = await readParticipantDraftFile(file(exportDraft(draft, format), `backup.${format}`), target);
  expect(restored[0]).toMatchObject({ review: true, sourceType: 'visitante', sourceEventId: 'source-event' });
 });

});
