import {describe,it,expect} from 'vitest';
import {readParticipantDraftFile} from './participantDraftFile';
import {exportDraft,type ParticipantDraft} from './participantDraftStore';
import type {EventView} from '../../../domains/Event';
const event={id:'event',title:'Evento',startsAt:'2026-10-26T18:00:00Z'} as EventView;
const file=(text:string,name:string)=>({name,size:new TextEncoder().encode(text).length,arrayBuffer:async()=>new TextEncoder().encode(text).buffer}) as File;
describe('Lista offline de participantes',()=>{
 it('accepts UTF-8, quoted CSV, semicolon and preserves original spelling',async()=>{
  expect(await readParticipantDraftFile(file('\uFEFFnome_transcrito;status\r\n"João, de Teste";revisar','names.csv'),event)).toEqual([{rawName:'João, de Teste',review:true}]);
  expect(await readParticipantDraftFile(file('["Álvaro D\'Ávila"]','names.json'),event)).toEqual([{rawName:"Álvaro D'Ávila",review:false}]);
 });
 it('rejects wrong destination, malformed CSV, conflicting aliases and excess rows',async()=>{
  await expect(readParticipantDraftFile(file('{"evento":{"id_evento_banco":"other"},"participantes":["Nome Teste"]}','a.json'),event)).rejects.toThrow('outro evento');
  await expect(readParticipantDraftFile(file('nome_transcrito\n"Nome','a.csv'),event)).rejects.toThrow('aspas');
  await expect(readParticipantDraftFile(file('[{"nome":"Nome Um","name":"Nome Dois"}]','a.json'),event)).rejects.toThrow('conflitantes');
  await expect(readParticipantDraftFile(file(JSON.stringify(Array(1001).fill('Nome Teste')),'a.json'),event)).rejects.toThrow('1.000');
 });
 it('exports recoverable JSON and escapes spreadsheet formulas without changing source names',async()=>{
  const draft={eventId:'event',eventSnapshot:{title:'Evento',startsAt:event.startsAt},rows:[{rawName:'=Nome Teste'}]} as ParticipantDraft;
  expect(exportDraft(draft,'csv')).toContain("'=Nome Teste");
  expect((await readParticipantDraftFile(file(exportDraft(draft,'json'),'backup.json'),event))[0].rawName).toBe('=Nome Teste');
  expect(draft.rows[0].rawName).toBe('=Nome Teste');
 });
});
