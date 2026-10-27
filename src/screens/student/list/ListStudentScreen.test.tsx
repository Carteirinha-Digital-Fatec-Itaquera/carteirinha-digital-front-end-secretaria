import { expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StudentsListScreen from './ListStudentScreen';
import { Student } from '../../../domains/Student';
import { findAllByQuery } from '../../../api/student/findAllByQuery';

vi.mock('../../../components/menuLateral/MenuLateral', () => ({ default: () => null }));
vi.mock('../../../api/student/findAllByQuery', () => ({ findAllByQuery: vi.fn() }));
vi.mock('../../../components/tabelaStudents/TabelaStudents', () => ({
  default: ({ students }: { students: Student[] }) => <ol>{students.map(s => <li key={s.ra}>{s.name}</li>)}</ol>,
}));

it('sorts names in Portuguese by default and preserves sorting after search and course filter', async () => {
  const students = [
    new Student({ ra: '3', name: 'Zélia', course: 'DSM' }),
    new Student({ ra: '2', name: 'bruno', course: 'DSM' }),
    new Student({ ra: '1', name: 'Álvaro', course: 'Automação' }),
  ];
  vi.mocked(findAllByQuery).mockResolvedValue(students);
  render(<MemoryRouter><StudentsListScreen /></MemoryRouter>);
  await screen.findByText('Álvaro');
  expect(screen.getAllByRole('listitem').map(n => n.textContent)).toEqual(['Álvaro', 'bruno', 'Zélia']);
  expect(students.map(s => s.ra)).toEqual(['3', '2', '1']);
  fireEvent.change(screen.getByLabelText('Filtrar por curso'), { target: { value: 'DSM' } });
  expect(screen.getAllByRole('listitem').map(n => n.textContent)).toEqual(['bruno', 'Zélia']);
  vi.mocked(findAllByQuery).mockResolvedValue([students[0], students[1]]);
  fireEvent.change(screen.getByRole('textbox', { name: /Buscar alunos/ }), { target: { value: 'b' } });
  await waitFor(() => expect(findAllByQuery).toHaveBeenLastCalledWith('b'));
  expect(screen.getAllByRole('listitem').map(n => n.textContent)).toEqual(['bruno', 'Zélia']);
});
