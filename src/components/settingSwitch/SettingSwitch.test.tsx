import {useState} from 'react';
import {describe,expect,it,vi} from 'vitest';
import {fireEvent,render,screen} from '@testing-library/react';
import SettingSwitch from './SettingSwitch';

describe('SettingSwitch',()=>{
 it('exposes a stable accessible label, checked state and description',()=>{
  render(<SettingSwitch label="Permitir visitantes" checked={false} onChange={vi.fn()} description="Pessoas sem conta institucional."/>);
  const control=screen.getByRole('switch',{name:'Permitir visitantes'});
  expect(control).not.toBeChecked();expect(control).toHaveAccessibleDescription('Pessoas sem conta institucional.');
  expect(screen.getByText('Desligado')).toBeInTheDocument();
 });
 it('requests changes without overriding confirmation controlled by the caller',()=>{
  const onChange=vi.fn();const {rerender}=render(<SettingSwitch label="Exigir localização" checked={false} onChange={onChange}/>);
  const control=screen.getByRole('switch');fireEvent.click(control);expect(onChange).toHaveBeenCalledWith(true);expect(control).not.toBeChecked();
  rerender(<SettingSwitch label="Exigir localização" checked onChange={onChange}/>);
  expect(control).toBeChecked();expect(control).toHaveAccessibleName('Exigir localização');
 });
 it('toggles when the text label is clicked and preserves native form serialization',()=>{
  function Form(){const [checked,setChecked]=useState(false);return <form aria-label="Configurações"><SettingSwitch label="Visitantes" name="visitorsAllowed" checked={checked} onChange={setChecked}/></form>}
  render(<Form/>);fireEvent.click(screen.getByText('Visitantes'));expect(screen.getByRole('switch')).toBeChecked();
  expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('visitorsAllowed')).toBe('on');
 });
 it('respects disabled controls and disabled ancestor fieldsets',()=>{
  const onChange=vi.fn();render(<fieldset disabled><SettingSwitch label="Geolocalização" checked onChange={onChange}/></fieldset>);
  expect(screen.getByRole('switch')).toBeDisabled();fireEvent.click(screen.getByText('Geolocalização'));expect(onChange).not.toHaveBeenCalled();
 });
});
