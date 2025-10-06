import { describe, it, expect } from 'vitest';
import { getDayOfWeek, getWeekdays, toIsoDateString, getNextWeekday } from '../../src/utils/date-utils';

describe('date-utils', () => {
  it('should convert date to day of week', () => {
    // 2025-10-06 is a Monday
    const monday = new Date('2025-10-06T12:00:00');
    expect(getDayOfWeek(monday)).toBe('Mon');
  });

  it('should generate 5 weekdays', () => {
    const weekdays = getWeekdays(new Date('2025-10-06T12:00:00'));
    expect(weekdays).toHaveLength(5);
    expect(getDayOfWeek(weekdays[0])).toBe('Mon');
    expect(getDayOfWeek(weekdays[4])).toBe('Fri');
  });

  it('should format ISO date string', () => {
    const date = new Date('2025-10-06T15:30:00');
    expect(toIsoDateString(date)).toBe('2025-10-06');
  });

  it('should find next weekday', () => {
    const monday = new Date('2025-10-06T12:00:00');
    const nextThu = getNextWeekday(monday, 'Thu');
    expect(nextThu).not.toBeNull();
    expect(getDayOfWeek(nextThu!)).toBe('Thu');
  });

  it('should return null for weekend days', () => {
    const monday = new Date('2025-10-06T12:00:00');
    expect(getNextWeekday(monday, 'Sat')).toBeNull();
  });
});
