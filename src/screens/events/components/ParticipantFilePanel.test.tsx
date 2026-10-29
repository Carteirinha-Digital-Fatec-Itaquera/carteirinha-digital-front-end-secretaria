import { it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ParticipantFilePanel from './ParticipantFilePanel';
import { apiRequest, ApiRequestError } from '../../../api/config/apiRequest';
import { management } from '../../../api/event/publicEventService';
import type { EventView } from '../../../domains/Event';
import {startSession} from '../../../api/auth/session';
import { loadDraft, type DraftRow } from './participantDraftStore';
vi.mock('./participantDraftStore',async importOriginal=>{
 const original=await importOriginal<typeof import('./participantDraftStore')>();
 return {...original,loadDraft:vi.fn().mockResolvedValue(null),saveDraft:vi.fn(async(value:import('./participantDraftStore').ParticipantDraft,revision:number)=>({...value,revision:revision+1,updatedAt:new Date().toISOString()}))};
});
beforeEach(()=>{const encode=(value:object)=>btoa(JSON.stringify(value)).replace(/=/g,'');startSession(encode({alg:'HS256'})+'.'+encode({sub:123,role:'secretary',exp:Date.now()/1000+3600})+'.signature-test');});
vi.mock('../../../api/config/apiRequest', async importOriginal => ({...await importOriginal<typeof import('../../../api/config/apiRequest')>(),apiRequest:vi.fn()}));
vi.mock('../../../api/event/publicEventService', () => ({ management: vi.fn() }));
it('analyzes before approval and emits only eligible rows', async () => {
  vi.mocked(apiRequest).mockResolvedValue({ items: [{ row: 1, name: 'Aluno Teste', status: 'READY', ra: '001', accountId: 'account' }, { row: 2, name: 'Nome ambíguo', status: 'AMBIGUOUS' }] });
  vi.mocked(management).mockResolvedValue({ message: 'Participação confirmada' });
  render(<ParticipantFilePanel event={{ id: 'evt', title: 'Evento teste', startsAt: '2026-10-26T18:00:00Z',endsAt:'2026-10-26T19:00:00Z' } as EventView} onUpdated={vi.fn()} />);
  const notes=await screen.findByLabelText('Nomes completos, um por linha');
  fireEvent.change(notes,{target:{value:'Aluno Teste\nNome ambíguo'}});
  fireEvent.click(screen.getByRole('button',{name:'Adicionar à lista'}));
  await screen.findByText('Aluno Teste');
  expect(apiRequest).not.toHaveBeenCalled();
  await waitFor(()=>expect(screen.getByRole('button',{name:'Conferir cadastros'})).not.toBeDisabled());
  fireEvent.click(screen.getByRole('button', { name: 'Conferir cadastros' }));
  await screen.findByText('Localizado e elegível');
  expect(management).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: /Registrar participações e emitir/ })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Justificativa do lote'), { target: { value: 'Participação conferida presencialmente' } });
  await waitFor(()=>expect(screen.getByRole('checkbox',{name:'Selecionar'})).not.toBeDisabled());
  fireEvent.click(screen.getByRole('checkbox',{name:'Selecionar'}));
  await waitFor(()=>expect(screen.getByLabelText(/Conferi os cadastros/)).not.toBeDisabled());
  fireEvent.click(screen.getByLabelText(/Conferi os cadastros/));
  fireEvent.click(screen.getByRole('button', { name: /Registrar participações e emitir/ }));
  await waitFor(() => expect(management).toHaveBeenCalledTimes(1));
  expect(management).toHaveBeenCalledWith('events/evt/manual-certificates', expect.objectContaining({ ra: '001', expectedAccountId: 'account', participationConfirmed: true }), 'POST', expect.any(AbortSignal));
});

it('allows reviewing a rejected identity only after confirming there is no server receipt', async()=>{
 vi.mocked(apiRequest).mockImplementation(async(path)=>path.endsWith('/status')?{items:[{known:false}]}:{items:[{row:1,name:'Pessoa Teste',status:'READY',ra:'001',accountId:'account'}]});
 vi.mocked(management).mockRejectedValue(new ApiRequestError(400,'Cadastro precisa ser conferido.'));
 render(<ParticipantFilePanel event={{id:'evt',title:'Evento teste',startsAt:'2026-10-26T18:00:00Z',endsAt:'2026-10-26T19:00:00Z'} as EventView} onUpdated={vi.fn()}/>);
 fireEvent.change(await screen.findByLabelText('Nomes completos, um por linha'),{target:{value:'Pessoa Teste'}});fireEvent.click(screen.getByRole('button',{name:'Adicionar à lista'}));
 await screen.findByText('Pessoa Teste');await waitFor(()=>expect(screen.getByRole('button',{name:'Conferir cadastros'})).not.toBeDisabled());fireEvent.click(screen.getByRole('button',{name:'Conferir cadastros'}));
 await screen.findByText('Localizado e elegível');fireEvent.change(screen.getByLabelText('Justificativa do lote'),{target:{value:'Conferência fictícia após falha de rede.'}});
 await waitFor(()=>expect(screen.getByRole('checkbox',{name:'Selecionar'})).not.toBeDisabled());fireEvent.click(screen.getByRole('checkbox',{name:'Selecionar'}));
 await waitFor(()=>expect(screen.getByLabelText(/Conferi os cadastros/)).not.toBeDisabled());fireEvent.click(screen.getByLabelText(/Conferi os cadastros/));
 await waitFor(()=>expect(screen.getByRole('button',{name:/Registrar participações e emitir/})).not.toBeDisabled());fireEvent.click(screen.getByRole('button',{name:/Registrar participações e emitir/}));
 fireEvent.click(screen.getByText('Ações'));
 const review=await screen.findByRole('button',{name:'Rever cadastro após falha'});await waitFor(()=>expect(review).not.toBeDisabled());fireEvent.click(review);
 await screen.findByText('Aguardando conferência');expect(apiRequest).toHaveBeenCalledWith('/event-management/events/evt/manual-certificate-operations/status',expect.objectContaining({method:'POST'}));
});
it('searches names with accents, combines filters, paginates and preserves selection', async () => {
  vi.mocked(apiRequest).mockResolvedValue({items:Array.from({length:27},(_,i)=>({row:i+1,status:i===0?'READY':'NOT_FOUND',ra:i===0?'001':undefined,accountId:i===0?'account':undefined}))});
  render(<ParticipantFilePanel event={{id:'evt',title:'Synthetic event',startsAt:'2026-10-26T18:00:00Z',endsAt:'2026-10-26T19:00:00Z'} as EventView} onUpdated={vi.fn()}/>);
  fireEvent.change(await screen.findByLabelText('Nomes completos, um por linha'),{target:{value:Array.from({length:27},(_,i)=>i===0?'\u00c1gata Fict\u00edcia':`Pessoa ficticia ${i}`).join('\n')}});
  fireEvent.click(screen.getByRole('button',{name:'Adicionar \u00e0 lista'}));
  await screen.findByText('Lista de participantes \u00b7 27');
  expect(document.querySelectorAll('.regularization-rows > li')).toHaveLength(25);
  fireEvent.click(screen.getByRole('button',{name:'Pr\u00f3xima p\u00e1gina'}));
  expect(document.querySelectorAll('.regularization-rows > li')).toHaveLength(2);
  await waitFor(()=>expect(screen.getByRole('button',{name:'Conferir cadastros'})).not.toBeDisabled());
  fireEvent.click(screen.getByRole('button',{name:'Conferir cadastros'}));
  fireEvent.change(screen.getByLabelText('Buscar por nome'),{target:{value:'agata'}});
  await screen.findByText('Localizado e eleg\u00edvel');
  await waitFor(()=>expect(screen.getByRole('checkbox',{name:'Selecionar'})).not.toBeDisabled());
  fireEvent.click(screen.getByRole('checkbox',{name:'Selecionar'}));
  await screen.findByText(/1 selecionado\(s\) na lista completa/);
  fireEvent.change(screen.getByLabelText('Filtrar lista'),{target:{value:'NOT_FOUND'}});
  expect(document.querySelectorAll('.regularization-rows > li')).toHaveLength(0);
  expect(screen.getByText(/Nenhum participante corresponde/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Filtrar lista'),{target:{value:'all'}});
  expect(screen.getByRole('checkbox',{name:'Selecionar'})).toBeChecked();
});

it('keeps row actions collapsed, supports Escape, and resets identity after correction', async () => {
  render(<ParticipantFilePanel event={{id:'evt',title:'Synthetic event',startsAt:'2026-10-26T18:00:00Z',endsAt:'2026-10-26T19:00:00Z'} as EventView} onUpdated={vi.fn()}/>);
  fireEvent.change(await screen.findByLabelText('Nomes completos, um por linha'),{target:{value:'Pessoa ficticia'}});
  fireEvent.click(screen.getByRole('button',{name:'Adicionar \u00e0 lista'}));
  await screen.findByText('Pessoa ficticia');
  const menu=document.querySelector('.participant-row-menu') as HTMLDetailsElement;
  expect(menu.open).toBe(false);
  fireEvent.click(menu.querySelector('summary')!);
  expect(menu.open).toBe(true);
  fireEvent.keyDown(menu,{key:'Escape'});
  expect(menu.open).toBe(false);
  expect(menu.querySelector('summary')).toHaveFocus();
  fireEvent.click(menu.querySelector('summary')!);
  fireEvent.click(screen.getByText('Corrigir nome anotado'));
  const input=screen.getByLabelText('Nome anotado');
  await waitFor(()=>expect(input).not.toBeDisabled());
  fireEvent.change(input,{target:{value:'Nome corrigido ficticio'}});
  fireEvent.blur(input);
  await screen.findByText('Nome corrigido ficticio');
  expect(screen.getByText('Aguardando confer\u00eancia')).toBeInTheDocument();
});


it('only offers row actions when a command exists for persisted processing states', async () => {
  const rows: DraftRow[] = [
    ...['PENDING_RENDER', 'RENDERING', 'RENDER_FAILED'].map((artifactState, i) => ({rowId:`pending-${i}`,rawName:`Pending PDF ${i}`,status:'DONE',operationId:`op-pending-${i}`,artifactState})),
    {rowId:'flight',rawName:'Waiting response',status:'IN_FLIGHT',operationId:'op-flight'},
    {rowId:'unknown',rawName:'Uncertain response',status:'OUTCOME_UNKNOWN',operationId:'op-unknown'},
    {rowId:'download',rawName:'Available PDF',status:'DONE',operationId:'op-download',artifactState:'READY',certificateId:'certificate'},
    {rowId:'error',rawName:'Rejected identity',status:'ERROR',operationId:'op-error'},
    {rowId:'draft',rawName:'Editable person',status:'DRAFT'},
  ];
  vi.mocked(loadDraft).mockResolvedValueOnce({schemaVersion:1,draftId:'123:evt',ownerSecretaryId:123,eventId:'evt',eventSnapshot:{title:'Synthetic event',startsAt:'2026-10-26T18:00:00Z',endsAt:'2026-10-26T19:00:00Z'},revision:1,updatedAt:new Date().toISOString(),rows,reason:''});
  render(<ParticipantFilePanel event={{id:'evt',title:'Synthetic event',startsAt:'2026-10-26T18:00:00Z',endsAt:'2026-10-26T19:00:00Z'} as EventView} onUpdated={vi.fn()}/>);
  await screen.findByText('Available PDF');
  const renderedRows=Array.from(document.querySelectorAll('.regularization-rows > li'));
  expect(renderedRows.slice(0,5).every(row=>!row.querySelector('.participant-row-menu'))).toBe(true);
  expect(renderedRows.slice(5).every(row=>row.querySelector('.participant-row-menu'))).toBe(true);
  expect(document.querySelectorAll('.participant-row-menu')).toHaveLength(3);
});
