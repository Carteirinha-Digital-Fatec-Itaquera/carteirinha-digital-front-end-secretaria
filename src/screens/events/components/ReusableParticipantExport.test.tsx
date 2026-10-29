import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ReusableParticipantExport from './ReusableParticipantExport';
import type { AttendanceView } from '../../../domains/Attendance';
describe('seleção de nomes reutilizáveis', () => {
 it('defaults to confirmed presence, permits explicit all and individual exclusion without emitting', () => {
  render(<ReusableParticipantExport eventId="origin" items={[{ id: 'one', studentName: 'Aluno Um', studentRa: 'ra', status: 'CONFIRMED' }, { id: 'two', studentName: 'Visitante Dois', studentRa: '', status: 'CHECKED_IN' }] as AttendanceView[]} />);
  fireEvent.click(screen.getByText('Exportar nomes para outra palestra'));
  expect(screen.getByRole('status')).toHaveTextContent('1 nomes selecionados');
  expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'all' } });
  expect(screen.getAllByRole('checkbox')).toHaveLength(2);
  fireEvent.click(screen.getAllByRole('checkbox')[0]);
  fireEvent.click(screen.getAllByRole('checkbox')[1]);
  expect(screen.getByRole('button', { name: 'Baixar nomes em CSV' })).toBeDisabled();
  expect(screen.getByText(/Visitantes exigirão revisão/)).toBeInTheDocument();
 });
});
