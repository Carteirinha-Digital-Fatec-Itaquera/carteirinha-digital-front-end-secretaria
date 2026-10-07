import { describe, it, expect } from 'vitest';
import {
  isValidSemester,
  formatSemester,
  isApprovedProjectCreditHref,
} from './projectCreditContact';

describe('projectCreditContact utils in secretaria', () => {
  describe('isValidSemester', () => {
    it('accepts valid YYYY.1 and YYYY.2 semesters', () => {
      expect(isValidSemester('2026.1')).toBe(true);
      expect(isValidSemester('2026.2')).toBe(true);
      expect(isValidSemester('2025.1')).toBe(true);
    });

    it('rejects invalid semester formats', () => {
      expect(isValidSemester('2026.3')).toBe(false);
      expect(isValidSemester('2026')).toBe(false);
      expect(isValidSemester('26.1')).toBe(false);
      expect(isValidSemester('invalid')).toBe(false);
      expect(isValidSemester('')).toBe(false);
    });
  });

  describe('formatSemester', () => {
    it('formats YYYY.1 and YYYY.2 to human friendly description', () => {
      expect(formatSemester('2026.1')).toBe('1º semestre de 2026');
      expect(formatSemester('2026.2')).toBe('2º semestre de 2026');
    });

    it('returns raw value when format does not match regex', () => {
      expect(formatSemester('custom')).toBe('custom');
    });
  });

  describe('isApprovedProjectCreditHref', () => {
    it('validates HTTPS links with queries and anchors', () => {
      expect(
        isApprovedProjectCreditHref({
          kind: 'github',
          label: 'GitHub',
          href: 'https://github.com/wellingtonspdev?tab=repositories#header',
        }),
      ).toBe(true);

      expect(
        isApprovedProjectCreditHref({
          kind: 'external',
          label: 'Blog',
          href: 'https://techblog.example.com/posts/architecture?ref=fatec',
        }),
      ).toBe(true);
    });

    it('validates mailto links', () => {
      expect(
        isApprovedProjectCreditHref({
          kind: 'email',
          label: 'E-mail',
          href: 'mailto:contato@fatec.sp.gov.br',
        }),
      ).toBe(true);
    });

    it('rejects non-HTTPS, dangerous schemes, CRLF and credentials', () => {
      expect(
        isApprovedProjectCreditHref({
          kind: 'portfolio',
          label: 'Inseguro',
          href: 'http://insecure.example.com',
        }),
      ).toBe(false);

      expect(
        isApprovedProjectCreditHref({
          kind: 'external',
          label: 'XSS',
          href: 'javascript:alert(1)',
        }),
      ).toBe(false);

      expect(
        isApprovedProjectCreditHref({
          kind: 'external',
          label: 'Credentials',
          href: 'https://user:pass@example.com',
        }),
      ).toBe(false);

      expect(
        isApprovedProjectCreditHref({
          kind: 'external',
          label: 'CRLF',
          href: 'https://example.com/\r\nInjected:true',
        }),
      ).toBe(false);
    });
  });
});
