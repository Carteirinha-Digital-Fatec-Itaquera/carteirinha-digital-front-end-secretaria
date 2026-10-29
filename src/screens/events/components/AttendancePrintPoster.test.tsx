import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import AttendancePrintPoster from './AttendancePrintPoster';
import type {EventView} from '../../../domains/Event';
const url='https://carteirinha-digital-front-end-aluno.vercel.app/p/abcdefghijklmnopqrstuv';
const event={id:'event',title:'Evento de demonstração',speaker:'Docente fictício',location:'Auditório principal',startsAt:'2026-10-27T01:00:00Z',endsAt:'2026-10-27T02:00:00Z',workloadMinutes:60,attendanceMode:'FINAL_ONLY',status:'IN_PROGRESS'} as EventView;
const props={event,qrUrl:url,checkpoint:'check-out' as const,version:1,stable:true};
beforeEach(()=>{vi.spyOn(window,'print').mockImplementation(()=>undefined);Object.defineProperty(HTMLImageElement.prototype,'decode',{configurable:true,value:vi.fn().mockResolvedValue(undefined)})});
afterEach(()=>{Reflect.deleteProperty(HTMLImageElement.prototype,'decode')});
describe('Cartaz institucional de presença',()=>{
 it('uses the same public QR, Brasilia schedule and institutional brands without a certificate claim',()=>{
  render(<AttendancePrintPoster {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Imprimir cartaz de presença'}));
  const poster=screen.getByRole('article',{name:'Cartaz de registro de presença'});
  expect(within(poster).getByText('26/10/2026')).toBeInTheDocument();expect(within(poster).getByText('22:00 – 23:00')).toBeInTheDocument();
  expect(within(poster).getByText(event.speaker)).toBeInTheDocument();expect(within(poster).getByText(event.location)).toBeInTheDocument();
  expect(within(poster).getByAltText('Centro Paula Souza')).toBeInTheDocument();expect(within(poster).getByAltText('Fatec Itaquera')).toBeInTheDocument();
  expect(within(poster).getByRole('link')).toHaveAttribute('href',url);expect(within(poster).getByText(/não é um certificado/)).toBeInTheDocument();
  expect(screen.getByRole('note')).toHaveTextContent('invalida');
 });
 it.each([{qrUrl:null},{stable:false},{disabled:true},{event:{...event,status:'CANCELLED' as const}},{qrUrl:'https://evil.example/p/abcdefghijklmnopqrstuv'},{qrUrl:url+'?token=private'}])('blocks invalid or unavailable QR: %j',overrides=>{
  render(<AttendancePrintPoster {...props} {...overrides}/>);expect(screen.getByRole('button',{name:'Imprimir cartaz de presença'})).toBeDisabled();
 });
 it('prints only after images are ready, without reporting physical success',async()=>{
  render(<AttendancePrintPoster {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Imprimir cartaz de presença'}));fireEvent.click(screen.getByRole('button',{name:'Imprimir / Salvar como PDF'}));
  await waitFor(()=>expect(window.print).toHaveBeenCalledTimes(1));expect(screen.queryByText('Impresso com sucesso')).toBeNull();
 });
 it('prevents printing with missing logos and allows retry',async()=>{
  vi.mocked(HTMLImageElement.prototype.decode).mockRejectedValue(new Error('Logo indisponível'));
  render(<AttendancePrintPoster {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Imprimir cartaz de presença'}));fireEvent.click(screen.getByRole('button',{name:'Imprimir / Salvar como PDF'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Logo indisponível');expect(window.print).not.toHaveBeenCalled();
 });
 it('removes preview when the QR becomes unavailable and supports legacy entry labels',()=>{
  const {rerender}=render(<AttendancePrintPoster {...props} event={{...event,attendanceMode:'TWO_PHASE'}} checkpoint="check-in"/>);fireEvent.click(screen.getByRole('button',{name:'Imprimir cartaz de presença'}));expect(screen.getByRole('heading',{name:'Registre sua entrada'})).toBeInTheDocument();
  rerender(<AttendancePrintPoster {...props} qrUrl={null}/>);expect(screen.queryByRole('dialog')).toBeNull();expect(window.print).not.toHaveBeenCalled();
 });
 it('allows a permanent event poster before checkpoint opening and explains reuse', async () => {
  render(<AttendancePrintPoster {...props} permanent version={0} qrUrl={url.replace('/p/', '/p/ev_')} />);
  fireEvent.click(screen.getByRole('button', { name: 'Imprimir cartaz de presença' }));
  expect(screen.getByRole('note')).toHaveTextContent('fixo por evento');
 });

});
