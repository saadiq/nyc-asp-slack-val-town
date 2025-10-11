// src/utils/date-utils.ts
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { addDays, startOfWeek, endOfWeek, format, isSameDay } from 'date-fns';
import { DayOfWeek } from '../types';

export const NYC_TIMEZONE = 'America/New_York';

/**
 * Get current date/time in NYC timezone
 */
export function getNycNow(): Date {
  return toZonedTime(new Date(), NYC_TIMEZONE);
}

/**
 * Format date in NYC timezone
 */
export function formatNycDate(date: Date, formatStr: string): string {
  return formatInTimeZone(date, NYC_TIMEZONE, formatStr);
}

/**
 * Convert day of week number (0=Sun, 1=Mon, ...) to our DayOfWeek type
 * Extracts day in NYC timezone to avoid wrong day near midnight UTC
 */
export function getDayOfWeek(date: Date): DayOfWeek {
  const dayMap: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  // Use formatInTimeZone to get day index in NYC timezone (0-6, where 0=Sunday)
  const dayIndex = parseInt(formatInTimeZone(date, NYC_TIMEZONE, 'i'), 10);
  return dayMap[dayIndex % 7]; // % 7 maps Sunday (7) back to 0
}

/**
 * Get the Monday of the current week (for week view)
 * Returns a Date object representing Monday at noon in NYC timezone
 * (using noon to avoid any timezone edge cases)
 *
 * For Saturday and Sunday: Returns the NEXT Monday (forward-looking)
 * For Mon-Fri: Returns the current week's Monday
 */
export function getThisMonday(now: Date = getNycNow()): Date {
  // Get day of week in NYC timezone (0=Sun, 1=Mon, etc.)
  const dayIndex = parseInt(formatInTimeZone(now, NYC_TIMEZONE, 'i'), 10);
  const dayOfWeek = dayIndex % 7;

  let daysToAdd: number;

  if (dayOfWeek === 0) {
    // Sunday: go forward 1 day to next Monday
    daysToAdd = 1;
  } else if (dayOfWeek === 6) {
    // Saturday: go forward 2 days to next Monday
    daysToAdd = 2;
  } else {
    // Mon-Fri: go back to this week's Monday
    // dayOfWeek 1=Mon (go back 0), 2=Tue (go back 1), etc.
    daysToAdd = -(dayOfWeek - 1);
  }

  // Use addDays for timezone-safe date arithmetic, then create Monday at noon NYC time
  const monday = addDays(now, daysToAdd);

  // Parse the date in NYC timezone and create a new Date at noon NYC time
  const mondayStr = formatInTimeZone(monday, NYC_TIMEZONE, 'yyyy-MM-dd');
  return new Date(`${mondayStr}T12:00:00${getCurrentNycOffset()}`);
}

/**
 * Get current NYC timezone offset string (e.g., "-04:00" for EDT, "-05:00" for EST)
 */
function getCurrentNycOffset(): string {
  const now = new Date();
  const nycTime = formatInTimeZone(now, NYC_TIMEZONE, 'xxx'); // Returns like "-04:00"
  return nycTime;
}

/**
 * Get the Friday of the current week
 */
export function getThisFriday(now: Date = getNycNow()): Date {
  const monday = getThisMonday(now);
  // Use addDays for timezone-safe arithmetic
  return addDays(monday, 4);
}

/**
 * Generate array of dates for Mon-Fri of current week
 */
export function getWeekdays(now: Date = getNycNow()): Date[] {
  const monday = getThisMonday(now);
  // Use addDays for timezone-safe arithmetic
  return [0, 1, 2, 3, 4].map(offset => addDays(monday, offset));
}

/**
 * Convert Date to ISO date string (YYYY-MM-DD) for comparison
 */
export function toIsoDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Check if two dates are the same day (ignoring time)
 */
export function isSameDayNyc(date1: Date, date2: Date): boolean {
  return isSameDay(
    toZonedTime(date1, NYC_TIMEZONE),
    toZonedTime(date2, NYC_TIMEZONE)
  );
}

/**
 * Get next weekday with specific day name (e.g., next Monday)
 * Returns null if dayName is weekend
 */
export function getNextWeekday(startDate: Date, targetDayName: DayOfWeek): Date | null {
  const dayNames: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const targetDayIndex = dayNames.indexOf(targetDayName);

  if (targetDayIndex === 0 || targetDayIndex === 6) {
    return null; // Weekend
  }

  let checkDate = addDays(startDate, 1);
  // Use getDayOfWeek which now properly extracts NYC timezone day
  while (getDayOfWeek(checkDate) !== targetDayName) {
    checkDate = addDays(checkDate, 1);
    // Safety: don't loop forever
    if (checkDate > addDays(startDate, 14)) return null;
  }

  return checkDate;
}
