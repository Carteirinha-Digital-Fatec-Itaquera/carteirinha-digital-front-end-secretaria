import { describe, it, expect } from 'vitest';
import {
  parseWorkloadHours,
  calculateEventEnd,
  toEventFormSchedule,
} from './eventSchedule';

describe('eventSchedule utils', () => {
  describe('parseWorkloadHours', () => {
    it('converts integer hours to minutes', () => {
      expect(parseWorkloadHours('2')).toBe(120);
      expect(parseWorkloadHours('1')).toBe(60);
      expect(parseWorkloadHours('3')).toBe(180);
    });

    it('converts decimal hours with comma or period to minutes', () => {
      expect(parseWorkloadHours('2,5')).toBe(150);
      expect(parseWorkloadHours('2.5')).toBe(150);
      expect(parseWorkloadHours('0,5')).toBe(30);
      expect(parseWorkloadHours('1.25')).toBe(75);
    });

    it('rejects invalid, negative, zero or non-numeric strings', () => {
      expect(parseWorkloadHours('2abc')).toBeNull();
      expect(parseWorkloadHours('abc')).toBeNull();
      expect(parseWorkloadHours('0')).toBeNull();
      expect(parseWorkloadHours('-1')).toBeNull();
      expect(parseWorkloadHours('')).toBeNull();
      expect(parseWorkloadHours('   ')).toBeNull();
      expect(parseWorkloadHours('1..5')).toBeNull();
    });
  });

  describe('calculateEventEnd', () => {
    it('calculates end time by adding workload minutes to startLocal', () => {
      const end = calculateEventEnd('2026-10-05T19:00', 120);
      expect(end).not.toBeNull();
      expect(end!.getHours()).toBe(21);
      expect(end!.getMinutes()).toBe(0);
      expect(end!.getDate()).toBe(5);
    });

    it('handles transition across midnight to next day', () => {
      const end = calculateEventEnd('2026-10-05T23:00', 120);
      expect(end).not.toBeNull();
      expect(end!.getDate()).toBe(6);
      expect(end!.getHours()).toBe(1);
      expect(end!.getMinutes()).toBe(0);
    });

    it('handles year transition on New Year Eve', () => {
      const end = calculateEventEnd('2026-12-31T23:00', 120);
      expect(end).not.toBeNull();
      expect(end!.getFullYear()).toBe(2027);
      expect(end!.getMonth()).toBe(0);
      expect(end!.getDate()).toBe(1);
      expect(end!.getHours()).toBe(1);
      expect(end!.getMinutes()).toBe(0);
    });

    it('returns null for invalid inputs or non-positive workload', () => {
      expect(calculateEventEnd('invalid', 120)).toBeNull();
      expect(calculateEventEnd('2026-10-05T19:00', 0)).toBeNull();
      expect(calculateEventEnd('2026-10-05T19:00', -60)).toBeNull();
    });
  });

  describe('toEventFormSchedule', () => {
    it('converts ISO timestamps to local schedule strings', () => {
      const start = new Date(2026, 9, 5, 19, 30, 0, 0); // Outubro = mês 9 (0-indexed)
      const end = new Date(2026, 9, 5, 21, 30, 0, 0);

      const schedule = toEventFormSchedule(start.toISOString(), end.toISOString());
      expect(schedule.startDate).toBe('2026-10-05');
      expect(schedule.startTime).toBe('19:30');
      expect(schedule.endDate).toBe('2026-10-05');
      expect(schedule.endTime).toBe('21:30');
    });

    it('formats single digit hours and minutes with leading zero', () => {
      const start = new Date(2026, 0, 1, 9, 5, 0, 0);
      const end = new Date(2026, 0, 1, 10, 5, 0, 0);

      const schedule = toEventFormSchedule(start.toISOString(), end.toISOString());
      expect(schedule.startDate).toBe('2026-01-01');
      expect(schedule.startTime).toBe('09:05');
      expect(schedule.endDate).toBe('2026-01-01');
      expect(schedule.endTime).toBe('10:05');
    });
  });
});
