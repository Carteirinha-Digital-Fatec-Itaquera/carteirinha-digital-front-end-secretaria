import { it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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
  await waitFor(()=>expect(screen.getByRole('checkbox',{name:/^Selecionar (?!todos)/})).not.toBeDisabled());
  fireEvent.click(screen.getByRole('checkbox',{name:/^Selecionar (?!todos)/}));
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
 await waitFor(()=>expect(screen.getByRole('checkbox',{name:/^Selecionar (?!todos)/})).not.toBeDisabled());fireEvent.click(screen.getByRole('checkbox',{name:/^Selecionar (?!todos)/}));
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
  await waitFor(()=>expect(screen.getByRole('checkbox',{name:/^Selecionar (?!todos)/})).not.toBeDisabled());
  fireEvent.click(screen.getByRole('checkbox',{name:/^Selecionar (?!todos)/}));
  await screen.findByText(/1 selecionado\(s\) na lista completa/);
  fireEvent.change(screen.getByLabelText('Filtrar lista'),{target:{value:'NOT_FOUND'}});
  expect(document.querySelectorAll('.regularization-rows > li')).toHaveLength(0);
  expect(screen.getByText(/Nenhum participante corresponde/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Filtrar lista'),{target:{value:'all'}});
  expect(screen.getByRole('checkbox',{name:/^Selecionar (?!todos)/})).toBeChecked();
});

it('keeps row actions collapsed, supports Escape, and resets identity after correction', async () => {
  render(<ParticipantFilePanel event={{id:'evt',title:'Synthetic event',startsAt:'2026-10-26T18:00:00Z',endsAt:'2026-10-26T19:00:00Z'} as EventView} onUpdated={vi.fn()}/>);
  fireEvent.change(await screen.findByLabelText('Nomes completos, um por linha'),{target:{value:'Pessoa ficticia'}});
  fireEvent.click(screen.getByRole('button',{name:'Adicionar \u00e0 lista'}));
  await screen.findByText('Pessoa ficticia');
  const menu=screen.getByRole('button', {name:'Ações de Pessoa ficticia'});
  expect(menu).toHaveAttribute('aria-expanded','false');
  fireEvent.click(menu);
  expect(menu).toHaveAttribute('aria-expanded','true');
  expect(screen.getByRole('region',{name:'Ações de Pessoa ficticia'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Detalhes de Pessoa ficticia'}));
  expect(menu).toHaveAttribute('aria-expanded','false');
  expect(screen.queryByRole('region',{name:'Ações de Pessoa ficticia'})).not.toBeInTheDocument();
  fireEvent.click(menu);
  fireEvent.keyDown(screen.getByRole('region',{name:'Ações de Pessoa ficticia'}),{key:'Escape'});
  expect(menu).toHaveAttribute('aria-expanded','false');
  expect(menu).toHaveFocus();
  fireEvent.click(menu);
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

it('records the declared source event in the audited manual reason only after approval', async () => {
 vi.mocked(management).mockClear();
 vi.mocked(loadDraft).mockResolvedValueOnce({ schemaVersion: 1, draftId: '123:evt', ownerSecretaryId: 123, eventId: 'evt', eventSnapshot: { title: 'Destino', startsAt: '2026-10-26T18:00:00Z', endsAt: '2026-10-26T19:00:00Z' }, revision: 1, updatedAt: new Date().toISOString(), rows: [{ rowId: 'one', rawName: 'Aluno Teste', status: 'READY', ra: '001', accountId: 'account', sourceEventId: 'source-event' }], reason: 'Participação conferida presencialmente' });
 vi.mocked(management).mockResolvedValue({ message: 'Participação confirmada' });
 render(<ParticipantFilePanel event={{ id: 'evt', title: 'Destino', startsAt: '2026-10-26T18:00:00Z', endsAt: '2026-10-26T19:00:00Z' } as EventView} onUpdated={vi.fn()} />);
 await screen.findByText('Aluno Teste');
 expect(management).not.toHaveBeenCalled();
 await waitFor(() => expect(screen.getByRole('checkbox', { name: /^Selecionar (?!todos)/ })).toBeEnabled());
 fireEvent.click(screen.getByRole('checkbox', { name: /^Selecionar (?!todos)/ }));
 await waitFor(() => expect(screen.getByLabelText(/Conferi os cadastros/)).toBeEnabled());
 fireEvent.click(screen.getByLabelText(/Conferi os cadastros/));
 fireEvent.click(screen.getByRole('button', { name: /Registrar participações e emitir/ }));
 await waitFor(() => expect(management).toHaveBeenCalledWith('events/evt/manual-certificates', expect.objectContaining({ reason: expect.stringContaining('Origem informada da lista: source-event') }), 'POST', expect.any(AbortSignal)));
});


it('reviews an ambiguous student in a dialog without issuing a certificate', async () => {
  vi.mocked(management).mockClear();
  vi.mocked(management).mockResolvedValue({total:1,items:[{accountId:'verified-account',ra:'002',name:'Pessoa Conferida',course:'DSM',status:'Ativo',email:'p***@test'}]});
  render(<ParticipantFilePanel event={{id:'evt',title:'Evento teste',startsAt:'2026-10-26T18:00:00Z',endsAt:'2026-10-26T19:00:00Z'} as EventView} onUpdated={vi.fn()}/>);
  fireEvent.change(await screen.findByLabelText('Nomes completos, um por linha'),{target:{value:'Pessoa anotada'}});
  fireEvent.click(screen.getByRole('button',{name:'Adicionar à lista'}));
  await screen.findByText('Pessoa anotada');
  fireEvent.click(screen.getByText('Ações'));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Conferir cadastro'})).toBeEnabled());
  fireEvent.click(screen.getByRole('button',{name:'Conferir cadastro'}));
  const dialog=screen.getByRole('dialog',{name:'Conferência de cadastro'});
  expect(within(dialog).getByRole('button',{name:'Usar este cadastro'})).toBeDisabled();
  fireEvent.click(within(dialog).getByRole('button',{name:'Buscar aluno'}));
  fireEvent.click(await within(dialog).findByRole('radio'));
  fireEvent.click(within(dialog).getByRole('button',{name:'Usar este cadastro'}));
  await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByText('Localizado e elegível')).toBeInTheDocument();
  expect(screen.getByRole('checkbox',{name:'Selecionar Pessoa anotada'})).not.toBeChecked();
  expect(vi.mocked(management).mock.calls.every(([path])=>path.startsWith('students/search'))).toBe(true);
});

it('keeps an ineligible identity error visible inside the review dialog', async () => {
  vi.mocked(management).mockResolvedValue({total:1,items:[{accountId:'inactive',ra:'003',name:'Pessoa Inativa',course:'DSM',status:'Inativo',email:'p***@test'}]});
  render(<ParticipantFilePanel event={{id:'evt',title:'Evento teste',startsAt:'2026-10-26T18:00:00Z',endsAt:'2026-10-26T19:00:00Z'} as EventView} onUpdated={vi.fn()}/>);
  fireEvent.change(await screen.findByLabelText('Nomes completos, um por linha'),{target:{value:'Pessoa anotada'}});
  fireEvent.click(screen.getByRole('button',{name:'Adicionar à lista'}));
  await screen.findByText('Pessoa anotada');
  fireEvent.click(screen.getByText('Ações'));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Conferir cadastro'})).toBeEnabled());
  fireEvent.click(screen.getByRole('button',{name:'Conferir cadastro'}));
  const dialog=screen.getByRole('dialog',{name:'Conferência de cadastro'});
  fireEvent.click(within(dialog).getByRole('button',{name:'Buscar aluno'}));
  fireEvent.click(await within(dialog).findByRole('radio'));
  fireEvent.click(within(dialog).getByRole('button',{name:'Usar este cadastro'}));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Aluno inativo');
  expect(dialog).toBeInTheDocument();
});


it('selects eligible filtered rows across pages and preserves selection outside the filter', async () => {
  const rows: DraftRow[] = [
    ...Array.from({length:27},(_,i)=>({rowId:`row-${i}`,rawName:`Pessoa ${i}`,status:'READY',ra:String(i),accountId:`account-${i}`})),
    {rowId:'missing',rawName:'Pessoa não localizada',status:'NOT_FOUND'},
    {rowId:'done',rawName:'Pessoa registrada',status:'DONE'},
  ];
  vi.mocked(loadDraft).mockResolvedValueOnce({schemaVersion:1,draftId:'123:evt',ownerSecretaryId:123,eventId:'evt',eventSnapshot:{title:'Evento',startsAt:'2026-10-26T18:00:00Z',endsAt:'2026-10-26T19:00:00Z'},revision:1,updatedAt:new Date().toISOString(),rows,reason:'Participação conferida presencialmente'});
  render(<ParticipantFilePanel event={{id:'evt',title:'Evento',startsAt:'2026-10-26T18:00:00Z',endsAt:'2026-10-26T19:00:00Z'} as EventView} onUpdated={vi.fn()}/>);
  const bulk=await screen.findByRole('checkbox',{name:'Selecionar todos os disponíveis no filtro'});
  await waitFor(()=>expect(bulk).toBeEnabled());
  fireEvent.click(screen.getByRole('checkbox',{name:'Selecionar Pessoa 0'}));
  await waitFor(()=>expect(bulk).toBePartiallyChecked());
  fireEvent.click(bulk);
  await screen.findByText(/27 selecionado\(s\) na lista completa/);
  fireEvent.click(screen.getByRole('button',{name:'Próxima página'}));
  expect(screen.getByRole('checkbox',{name:'Selecionar Pessoa 26'})).toBeChecked();
  expect(screen.queryByRole('checkbox',{name:'Selecionar Pessoa não localizada'})).not.toBeInTheDocument();
  expect(screen.queryByRole('checkbox',{name:'Selecionar Pessoa registrada'})).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Buscar por nome'),{target:{value:'Pessoa 25'}});
  await waitFor(()=>expect(bulk).toBeEnabled());fireEvent.click(bulk);
  await screen.findByText(/26 selecionado\(s\) na lista completa/);
  fireEvent.change(screen.getByLabelText('Buscar por nome'),{target:{value:''}});
  expect(screen.getByRole('checkbox',{name:'Selecionar Pessoa 0'})).toBeChecked();
  expect(bulk).toBePartiallyChecked();
  fireEvent.change(screen.getByLabelText('Filtrar lista'),{target:{value:'NOT_FOUND'}});
  expect(bulk).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Filtrar lista'),{target:{value:'READY'}});
  await waitFor(()=>expect(bulk).toBeEnabled());fireEvent.click(bulk);
  await screen.findByText(/27 selecionado\(s\) na lista completa/);
  await waitFor(()=>expect(screen.getByLabelText(/Conferi os cadastros/)).toBeEnabled());
  fireEvent.click(screen.getByLabelText(/Conferi os cadastros/));
  await waitFor(()=>expect(bulk).toBeEnabled());fireEvent.click(bulk);
  await screen.findByText(/0 selecionado\(s\) na lista completa/);
  expect(screen.getByLabelText(/Conferi os cadastros/)).not.toBeChecked();
});
