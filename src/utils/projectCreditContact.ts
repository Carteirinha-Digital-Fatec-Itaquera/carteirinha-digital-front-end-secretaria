import type { ProjectCreditContact } from '../domains/ProjectCredits';

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const SEMESTER_REGEX = /^\d{4}\.[12]$/;

export function isValidSemester(semester: string): boolean {
  if (!semester || typeof semester !== 'string') return false;
  return SEMESTER_REGEX.test(semester.trim());
}

export function formatSemester(semester: string): string {
  const match = /^(\d{4})\.([12])$/.exec(semester);
  if (!match) return semester;
  return `${match[2]}º semestre de ${match[1]}`;
}

export function isApprovedProjectCreditHref(
  contact: ProjectCreditContact,
): boolean {
  if (!contact || !contact.href || typeof contact.href !== 'string') {
    return false;
  }

  // Reject CRLF characters
  if (/[\r\n]/.test(contact.href) || (contact.label && /[\r\n]/.test(contact.label))) {
    return false;
  }

  if (contact.kind === 'email') {
    let raw = contact.href.trim();
    if (raw.toLowerCase().startsWith('mailto:')) {
      raw = raw.slice(7);
    }
    return EMAIL_REGEX.test(raw);
  }

  let url: URL;
  try {
    url = new URL(contact.href.trim());
  } catch {
    return false;
  }

  // Only allow HTTPS protocol
  if (url.protocol !== 'https:') {
    return false;
  }

  // Reject embedded credentials
  if (url.username || url.password) {
    return false;
  }

  return true;
}
