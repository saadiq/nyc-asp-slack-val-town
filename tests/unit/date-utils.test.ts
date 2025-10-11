import { describe, it, expect } from 'vitest';
import { getDayOfWeek, getWeekdays, toIsoDateString, getNextWeekday, getThisMonday, getThisFriday } from '../../src/utils/date-utils';

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

  describe('getThisMonday - forward-looking for weekends', () => {
    it('should return current Monday for Monday', () => {
      // 2025-10-06 is a Monday
      const monday = new Date('2025-10-06T12:00:00');
      const thisMonday = getThisMonday(monday);
      expect(getDayOfWeek(thisMonday)).toBe('Mon');
      expect(toIsoDateString(thisMonday)).toBe('2025-10-06');
    });

    it('should return current Monday for Wednesday', () => {
      // 2025-10-08 is a Wednesday
      const wednesday = new Date('2025-10-08T12:00:00');
      const thisMonday = getThisMonday(wednesday);
      expect(getDayOfWeek(thisMonday)).toBe('Mon');
      expect(toIsoDateString(thisMonday)).toBe('2025-10-06');
    });

    it('should return current Monday for Friday', () => {
      // 2025-10-10 is a Friday
      const friday = new Date('2025-10-10T12:00:00');
      const thisMonday = getThisMonday(friday);
      expect(getDayOfWeek(thisMonday)).toBe('Mon');
      expect(toIsoDateString(thisMonday)).toBe('2025-10-06');
    });

    it('should return NEXT Monday for Saturday (forward-looking)', () => {
      // 2025-10-11 is a Saturday
      const saturday = new Date('2025-10-11T12:00:00');
      const thisMonday = getThisMonday(saturday);
      expect(getDayOfWeek(thisMonday)).toBe('Mon');
      expect(toIsoDateString(thisMonday)).toBe('2025-10-13'); // Next Monday, not previous
    });

    it('should return NEXT Monday for Sunday (forward-looking)', () => {
      // 2025-10-12 is a Sunday
      const sunday = new Date('2025-10-12T12:00:00');
      const thisMonday = getThisMonday(sunday);
      expect(getDayOfWeek(thisMonday)).toBe('Mon');
      expect(toIsoDateString(thisMonday)).toBe('2025-10-13'); // Next Monday, not previous
    });
  });

  describe('getWeekdays - forward-looking for weekends', () => {
    it('should return Mon-Fri of current week when called on Wednesday', () => {
      // 2025-10-08 is a Wednesday
      const wednesday = new Date('2025-10-08T12:00:00');
      const weekdays = getWeekdays(wednesday);
      expect(weekdays).toHaveLength(5);
      expect(toIsoDateString(weekdays[0])).toBe('2025-10-06'); // Mon
      expect(toIsoDateString(weekdays[4])).toBe('2025-10-10'); // Fri
    });

    it('should return Mon-Fri of NEXT week when called on Saturday', () => {
      // 2025-10-11 is a Saturday
      const saturday = new Date('2025-10-11T12:00:00');
      const weekdays = getWeekdays(saturday);
      expect(weekdays).toHaveLength(5);
      expect(toIsoDateString(weekdays[0])).toBe('2025-10-13'); // Next Mon
      expect(toIsoDateString(weekdays[4])).toBe('2025-10-17'); // Next Fri
    });

    it('should return Mon-Fri of NEXT week when called on Sunday', () => {
      // 2025-10-12 is a Sunday
      const sunday = new Date('2025-10-12T12:00:00');
      const weekdays = getWeekdays(sunday);
      expect(weekdays).toHaveLength(5);
      expect(toIsoDateString(weekdays[0])).toBe('2025-10-13'); // Next Mon
      expect(toIsoDateString(weekdays[4])).toBe('2025-10-17'); // Next Fri
    });
  });

  describe('getThisFriday - forward-looking for weekends', () => {
    it('should return current Friday when called on Wednesday', () => {
      // 2025-10-08 is a Wednesday
      const wednesday = new Date('2025-10-08T12:00:00');
      const thisFriday = getThisFriday(wednesday);
      expect(getDayOfWeek(thisFriday)).toBe('Fri');
      expect(toIsoDateString(thisFriday)).toBe('2025-10-10');
    });

    it('should return NEXT Friday when called on Saturday', () => {
      // 2025-10-11 is a Saturday
      const saturday = new Date('2025-10-11T12:00:00');
      const thisFriday = getThisFriday(saturday);
      expect(getDayOfWeek(thisFriday)).toBe('Fri');
      expect(toIsoDateString(thisFriday)).toBe('2025-10-17'); // Next Friday
    });

    it('should return NEXT Friday when called on Sunday', () => {
      // 2025-10-12 is a Sunday
      const sunday = new Date('2025-10-12T12:00:00');
      const thisFriday = getThisFriday(sunday);
      expect(getDayOfWeek(thisFriday)).toBe('Fri');
      expect(toIsoDateString(thisFriday)).toBe('2025-10-17'); // Next Friday
    });
  });
});
