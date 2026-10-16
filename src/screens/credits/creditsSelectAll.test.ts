import { describe, expect, it } from 'vitest';
import {
  allAvailableSemestersSelected, groupForEditing,
  semesterChoices, setAllSemestersForGroup,
} from './creditsParticipationUi';

const part = (semester: string, rolesString = 'Orientador') => ({
  semester, course: '', rolesString, contribution: '', confirmed: true,
});

describe('seleção de todos os semestres', () => {
  const choices = semesterChoices([], 2026);

  it('seleciona somente os semestres liberados', () => {
    const result = setAllSemestersForGroup([part('')], [0], choices, true);
    expect(result.map((item) => item.semester)).toEqual(choices);
    expect(groupForEditing(result)).toHaveLength(1);
    expect(allAvailableSemestersSelected(result, [0, 1, 2, 3], choices)).toBe(true);
    expect(result.map((item) => item.semester)).not.toContain('2027.1');
  });

  it('desmarca todos preservando a função', () => {
    const result = setAllSemestersForGroup(
      [part('2025.1'), part('2025.2')], [0, 1], choices, false,
    );
    expect(result).toEqual([part('')]);
    expect(allAvailableSemestersSelected(result, [0], choices)).toBe(false);
  });

  it('não toma semestres já usados por outro grupo', () => {
    const result = setAllSemestersForGroup(
      [part('2025.1'), part('2025.2', 'Desenvolvedor')], [0], choices, true,
    );
    expect(result.filter((p) => p.semester === '2025.2')).toHaveLength(1);
    expect(result.find((p) => p.semester === '2025.2')?.rolesString).toBe('Desenvolvedor');
    expect(result.filter((p) => p.rolesString === 'Orientador')).toHaveLength(3);
  });
});
