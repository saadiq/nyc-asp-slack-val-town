import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatInTimeZone } from 'date-fns-tz';
import { NYC_TIMEZONE } from '../../src/utils/date-utils';

describe('timezone hour extraction', () => {
  it('should extract NYC hour correctly regardless of system timezone', () => {
    // Test cases: [date string, expected NYC hour]
    const testCases: Array<[string, number]> = [
      // 5 AM EDT (during DST, UTC-4)
      ['2025-10-10T05:00:00-04:00', 5],
      // 5 AM EST (outside DST, UTC-5)
      ['2025-01-10T05:00:00-05:00', 5],
      // Midnight NYC time
      ['2025-10-10T00:00:00-04:00', 0],
      // Noon NYC time
      ['2025-10-10T12:00:00-04:00', 12],
      // 11 PM NYC time
      ['2025-10-10T23:00:00-04:00', 23],
    ];

    for (const [dateStr, expectedHour] of testCases) {
      const date = new Date(dateStr);
      const hour = parseInt(formatInTimeZone(date, NYC_TIMEZONE, 'H'), 10);

      expect(hour).toBe(expectedHour);
    }
  });

  it('should demonstrate that .getHours() returns wrong hour for NYC time', () => {
    // 5 AM EDT = 9 AM UTC
    const nycDate = new Date('2025-10-10T05:00:00-04:00');

    // Using .getHours() will return the hour in the system's local timezone
    // which may not be NYC time
    const wrongHour = nycDate.getHours();

    // Using formatInTimeZone correctly extracts NYC hour
    const correctHour = parseInt(formatInTimeZone(nycDate, NYC_TIMEZONE, 'H'), 10);

    expect(correctHour).toBe(5);

    // If running in UTC, .getHours() would return 9 (wrong!)
    // If running in EDT/EST, .getHours() would return 5 (coincidentally correct)
    // This demonstrates why we need formatInTimeZone
    const utcHour = nycDate.getUTCHours();
    expect(utcHour).toBe(9); // 5 AM EDT = 9 AM UTC
  });

  it('should handle DST transitions correctly', () => {
    // Test Spring Forward (DST starts, clocks jump from 2 AM to 3 AM)
    // 2:30 AM doesn't exist, so it becomes 3:30 AM EDT
    const springForward = new Date('2025-03-09T02:30:00-05:00'); // EST (before DST)
    const springHour = parseInt(formatInTimeZone(springForward, NYC_TIMEZONE, 'H'), 10);
    // At 2:30 AM EST (UTC-5), DST has started, so it becomes 3:30 AM EDT (UTC-4)
    expect(springHour).toBe(3);

    // Test Fall Back (DST ends at 2 AM, clocks fall back to 1 AM)
    // When we specify 2:30 AM EDT (UTC-4), that's the first 2:30 AM
    // When converted to NYC timezone, it stays 2:30 AM but in EST (UTC-5)
    const fallBack = new Date('2025-11-02T02:30:00-04:00'); // EDT (during DST, first occurrence)
    const fallHour = parseInt(formatInTimeZone(fallBack, NYC_TIMEZONE, 'H'), 10);
    // This is actually before the DST transition completes, so it's 1:30 AM EST
    expect(fallHour).toBe(1);

    // Test the second occurrence of 2:30 AM (after DST ends)
    const fallBackSecond = new Date('2025-11-02T02:30:00-05:00'); // EST (after DST)
    const fallHourSecond = parseInt(formatInTimeZone(fallBackSecond, NYC_TIMEZONE, 'H'), 10);
    expect(fallHourSecond).toBe(2);
  });
});
