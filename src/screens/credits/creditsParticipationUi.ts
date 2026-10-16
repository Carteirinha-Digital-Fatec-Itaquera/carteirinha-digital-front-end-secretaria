import type { ProjectCreditParticipation } from '../../domains/ProjectCredits';

export interface EditableParticipation {
  semester: string;
  course: string;
  rolesString: string;
  contribution: string;
  confirmed: boolean;
}

export interface ParticipationEditGroup extends Omit<EditableParticipation, 'semester'> {
  semesters: string[];
  indices: number[];
}

/** Une apenas dados com a mesma função/curso/contribuição, sem mudar a API. */
export function groupForEditing(items: EditableParticipation[]): ParticipationEditGroup[] {
  const groups: ParticipationEditGroup[] = [];
  for (const [index, item] of items.entries()) {
    const existing = item.semester.trim() ? groups.find((group) =>
      group.indices.every((previousIndex) => Boolean(items[previousIndex].semester.trim())) &&
      group.course.trim() === item.course.trim() &&
      group.rolesString.split(',').map((s) => s.trim()).filter(Boolean).join(',') ===
        item.rolesString.split(',').map((s) => s.trim()).filter(Boolean).join(',') &&
      group.contribution.trim() === item.contribution.trim() &&
      group.confirmed === item.confirmed,
    ) : undefined;
    if (existing) {
      existing.indices.push(index);
      if (item.semester.trim() && !existing.semesters.includes(item.semester.trim())) {
        existing.semesters.push(item.semester.trim());
      }
    } else {
      groups.push({
        indices: [index],
        semesters: item.semester.trim() ? [item.semester.trim()] : [],
        course: item.course,
        rolesString: item.rolesString,
        contribution: item.contribution,
        confirmed: item.confirmed,
      });
    }
  }
  return groups;
}

export function semesterNumber(semester: string): number | null {
  const match = /^(\d{4})\.([12])$/.exec(semester);
  return match ? Number(match[1]) * 2 + Number(match[2]) - 1 : null;
}

export function shortSemester(semester: string): string {
  const match = /^(\d{4})\.([12])$/.exec(semester);
  return match ? `${match[2]}º sem de ${match[1]}` : semester;
}

export function semesterRanges(semesters: string[]): { start: string; end: string }[] {
  const uniques = [...new Set(semesters.filter(Boolean))];
  uniques.sort((a, b) => (semesterNumber(a) ?? Infinity) - (semesterNumber(b) ?? Infinity) || a.localeCompare(b));
  const ranges: { start: string; end: string }[] = [];
  for (const semester of uniques) {
    const previous = ranges[ranges.length - 1];
    const n = semesterNumber(semester);
    if (previous && n !== null && semesterNumber(previous.end) === n - 1) {
      previous.end = semester;
    } else {
      ranges.push({ start: semester, end: semester });
    }
  }
  return ranges;
}

export function shortRange(start: string, end: string): string {
  return start === end ? shortSemester(start) : `${shortSemester(start)} a ${shortSemester(end)}`;
}

/** Agrega visualmente apenas registros consecutivos de conteúdo equivalente. */
export function groupDisplayParticipations(items: ProjectCreditParticipation[]) {
  const sorted = [...items].sort((a, b) =>
    (semesterNumber(a.semester) ?? Infinity) - (semesterNumber(b.semester) ?? Infinity) ||
    a.semester.localeCompare(b.semester),
  );
  const results: (ProjectCreditParticipation & { from: string; to: string })[] = [];
  for (const part of sorted) {
    const last = results[results.length - 1];
    const currentNumber = semesterNumber(part.semester);
    const same = last && currentNumber !== null && semesterNumber(last.to) === currentNumber - 1 &&
      (last.course ?? '').trim() === (part.course ?? '').trim() &&
      (last.contribution ?? '').trim() === (part.contribution ?? '').trim() &&
      JSON.stringify((last.roles ?? []).map((r) => r.trim())) === JSON.stringify((part.roles ?? []).map((r) => r.trim()));
    if (same) {
      last.to = part.semester;
    } else {
      results.push({ ...part, from: part.semester, to: part.semester });
    }
  }
  return results;
}

/**
 * O projeto começou em 2025.1. Novos semestres passam a ser listados
 * automaticamente quando o ano correspondente começa no calendário local.
 * Não altera dados históricos já persistidos na API.
 */
export function semesterChoices(_items: EditableParticipation[], currentYear = new Date().getFullYear()): string[] {
  const choices: string[] = [];
  for (let year = currentYear; year >= 2025; year--) {
    choices.push(`${year}.2`, `${year}.1`);
  }
  return choices;
}

/** Semestres livres para este grupo, sem incluir os já usados em outra função. */
export function availableSemestersForGroup(
  items: EditableParticipation[],
  groupIndices: number[],
  choices: string[],
): string[] {
  const own = new Set(groupIndices);
  return choices.filter((semester) =>
    !items.some((item, index) => !own.has(index) && item.semester === semester),
  );
}

export function allAvailableSemestersSelected(
  items: EditableParticipation[],
  groupIndices: number[],
  choices: string[],
): boolean {
  const available = availableSemestersForGroup(items, groupIndices, choices);
  return available.length > 0 && available.every((semester) =>
    groupIndices.some((index) => items[index]?.semester === semester),
  );
}

/** Seleciona ou limpa os semestres livres sem apagar curso, função e contribuição. */
export function setAllSemestersForGroup(
  items: EditableParticipation[],
  groupIndices: number[],
  choices: string[],
  checked: boolean,
): EditableParticipation[] {
  const source = items[groupIndices[0]];
  if (!source) return items;
  const available = availableSemestersForGroup(items, groupIndices, choices);
  if (available.length === 0) return items;

  // Mantém semestres históricos já registrados que não estão entre as novas opções.
  const historical = groupIndices
    .map((index) => items[index]?.semester ?? '')
    .filter((semester) => Boolean(semester) && !choices.includes(semester));
  const next = checked ? [...new Set([...historical, ...available])] : historical;
  const replacement = next.length > 0
    ? next.map((semester) => ({ ...source, semester }))
    : [{ ...source, semester: '' }];

  const own = new Set(groupIndices);
  let inserted = false;
  return items.flatMap((item, index) => {
    if (!own.has(index)) return [item];
    if (inserted) return [];
    inserted = true;
    return replacement;
  });
}
