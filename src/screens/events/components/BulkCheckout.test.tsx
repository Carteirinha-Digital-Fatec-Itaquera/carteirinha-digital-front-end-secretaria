import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ParticipantsPanel } from './ParticipantsPanel';
import { ManualCheckoutDialog } from './ManualCheckoutDialog';
import * as api from '../../../api/event/publicEventService';
import type { AttendanceView } from '../../../domains/Attendance';
const row=(id:string):AttendanceView=>({id,eventId:'event-id',eventTitle:'Atividade',studentRa:id,studentName:'Pessoa '+id,studentCourse:'DSM',status:'CHECKED_IN',checkInAt:'2026-10-26T10:00:00Z',checkOutAt:null});
const props={items:[row('1'),row('2'),{...row('3'),status:'CONFIRMED' as const,checkOutAt:'2026-10-26T11:00:00Z'}],loading:false,refreshing:false,stale:false,error:null,lastUpdatedAt:null,onRefresh:vi.fn(),eventId:'event-id'};
const show=Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype,'showModal'),close=Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype,'close');
beforeEach(()=>{vi.restoreAllMocks();props.onRefresh.mockClear();Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value(){this.setAttribute('open','');}});Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value(){this.removeAttribute('open');}});});
afterEach(()=>{if(show)Object.defineProperty(HTMLDialogElement.prototype,'showModal',show);else Reflect.deleteProperty(HTMLDialogElement.prototype,'showModal');if(close)Object.defineProperty(HTMLDialogElement.prototype,'close',close);else Reflect.deleteProperty(HTMLDialogElement.prototype,'close');});
function fill(){fireEvent.change(screen.getByLabelText('Justificativa obrigatória'),{target:{value:'Saídas conferidas em lista presencial.'}});fireEvent.click(screen.getByLabelText(/Confirmo a participação e a saída/));}
describe('Bulk manual checkout',()=>{
 it('selects only pending entries and confirms one batch with explicit consent',async()=>{
  const request=vi.spyOn(api,'management').mockImplementation((path,body)=>Promise.resolve(path.endsWith('/manual-checkouts')?{processedIds:(body as {attendanceIds:string[]}).attendanceIds}:[]));
  render(<ParticipantsPanel {...props}/>);
  fireEvent.click(screen.getByLabelText('Selecionar todos com saída pendente'));
  expect(screen.getByLabelText('Selecionar Pessoa 1')).toBeChecked();expect(screen.queryByLabelText('Selecionar Pessoa 3')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Confirmar saídas selecionadas (2)'}));fill();
  fireEvent.click(screen.getByRole('button',{name:'Confirmar saídas selecionadas'}));
  await waitFor(()=>expect(props.onRefresh).toHaveBeenCalledTimes(1));
  expect(request).toHaveBeenCalledWith('events/event-id/manual-checkouts',{attendanceIds:['1','2'],reason:'Saídas conferidas em lista presencial.',confirmed:true});
 });
 it('cancel does not send a checkout',async()=>{
  const request=vi.spyOn(api,'management').mockResolvedValue([]);await act(async()=>{render(<ParticipantsPanel {...props}/>);});
  fireEvent.click(screen.getByLabelText('Selecionar Pessoa 1'));fireEvent.click(screen.getByRole('button',{name:'Confirmar saídas selecionadas (1)'}));
  fireEvent.click(screen.getByRole('button',{name:'Cancelar'}));expect(request.mock.calls.some(([path])=>path.endsWith('/manual-checkouts'))).toBe(false);
 });
 it('processes chunks and retries only those not completed after a later failure',async()=>{
  let count=0;const request=vi.spyOn(api,'management').mockImplementation((_path,body)=>{count++;return count===2?Promise.reject(new Error('Falha de rede')):Promise.resolve({processedIds:(body as {attendanceIds:string[]}).attendanceIds});});
  const targets=Array.from({length:51},(_,i)=>({id:String(i),name:'Pessoa '+i}));const onSaved=vi.fn(),onClose=vi.fn();
  render(<ManualCheckoutDialog eventId="event-id" attendances={targets} onSaved={onSaved} onClose={onClose}/>);fill();
  fireEvent.click(screen.getByRole('button',{name:'Confirmar saídas selecionadas'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('50 de 51 processados');expect(onClose).not.toHaveBeenCalled();
  expect((request.mock.calls[0][1] as {attendanceIds:string[]}).attendanceIds).toHaveLength(50);
  fireEvent.click(screen.getByRole('button',{name:'Confirmar saídas selecionadas'}));
  await waitFor(()=>expect(onClose).toHaveBeenCalledTimes(1));
  expect((request.mock.calls[2][1] as {attendanceIds:string[]}).attendanceIds).toEqual(['50']);
  expect(onSaved).toHaveBeenLastCalledWith(targets.map(target=>target.id));
 });
});
