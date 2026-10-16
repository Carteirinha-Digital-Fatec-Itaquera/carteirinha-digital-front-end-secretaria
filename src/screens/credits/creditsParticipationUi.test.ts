import { describe, expect, it } from 'vitest';
import {
  groupDisplayParticipations, groupForEditing, semesterChoices,
  semesterRanges, shortRange,
} from './creditsParticipationUi';

describe('participações compactas da Secretaria', () => {
  it('agrupa o editor de quatro semestres com a mesma função', () => {
    const items = ['2025.1', '2025.2', '2026.1', '2026.2'].map((semester) => ({
      semester, course: 'DSM', rolesString: 'Orientador', contribution: '', confirmed: true,
    }));
    const groups = groupForEditing(items);
    expect(groups).toHaveLength(1);
    expect(groups[0].indices).toEqual([0, 1, 2, 3]);
    expect(semesterChoices(items, 2026)).toContain('2025.1');
  });

  it('mostra apenas os semestres de 2025 até o ano atual', () => {
    const choices = semesterChoices([], 2026);
    expect(choices).toEqual(['2026.2', '2026.1', '2025.2', '2025.1']);
    expect(choices).not.toContain('2024.2');
    expect(choices).not.toContain('2027.1');
    expect(choices).not.toContain('2028.1');
  });

  it('libera o primeiro semestre de 2027 automaticamente em 2027', () => {
    expect(semesterChoices([], 2027)).toEqual([
      '2027.2', '2027.1', '2026.2', '2026.1', '2025.2', '2025.1',
    ]);
  });

  it('renderiza uma faixa única consecutiva no formato abreviado', () => {
    const list = ['2025.1', '2025.2', '2026.1', '2026.2'].map((semester) => ({semester, roles: ['Orientador']}));
    const grouped = groupDisplayParticipations(list);
    expect(grouped).toHaveLength(1);
    expect(shortRange(grouped[0].from, grouped[0].to)).toBe('1º sem de 2025 a 2º sem de 2026');
  });

  it('não une interrupções nem funções diferentes', () => {
    const grouped = groupDisplayParticipations([
      {semester:'2025.1',roles:['Orientador']},
      {semester:'2026.1',roles:['Orientador']},
      {semester:'2026.2',roles:['Desenvolvedor']},
    ]);
    expect(grouped).toHaveLength(3);
    expect(semesterRanges(['2025.1', '2026.1']).map((x) => shortRange(x.start,x.end)))
      .toEqual(['1º sem de 2025','1º sem de 2026']);
  });

  it('preserva conteúdos e semestres separados para funções distintas', () => {
    const groups = groupForEditing([
      {semester:'2025.1',course:'',rolesString:'Orientador',contribution:'A',confirmed:true},
      {semester:'2025.2',course:'',rolesString:'Orientador',contribution:'B',confirmed:true},
    ]);
    expect(groups).toHaveLength(2);
  });
});

// Semestres sem seleção ainda devem aparecer como grupos independentes no formulário.
describe('grupos incompletos', () => {
  it('mantém grupos vazios separados', () => {
    const blank = {semester:'',course:'',rolesString:'',contribution:'',confirmed:true};
    expect(groupForEditing([blank, blank])).toHaveLength(2);
    expect(groupForEditing([blank, {...blank,semester:'2026.1'}])).toHaveLength(2);
  });
});
