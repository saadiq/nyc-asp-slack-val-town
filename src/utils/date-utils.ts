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
 */
export function getDayOfWeek(date: Date): DayOfWeek {
  const dayMap: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return dayMap[date.getDay()];
}

/**
 * Get the Monday of the current week (for week view)
 */
export function getThisMonday(now: Date = getNycNow()): Date {
  return startOfWeek(now, { weekStartsOn: 1 }); // 1 = Monday
}

/**
 * Get the Friday of the current week
 */
export function getThisFriday(now: Date = getNycNow()): Date {
  const monday = getThisMonday(now);
  return addDays(monday, 4); // Mon + 4 = Fri
}

/**
 * Generate array of dates for Mon-Fri of current week
 */
export function getWeekdays(now: Date = getNycNow()): Date[] {
  const monday = getThisMonday(now);
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
  while (checkDate.getDay() !== targetDayIndex) {
    checkDate = addDays(checkDate, 1);
    // Safety: don't loop forever
    if (checkDate > addDays(startDate, 14)) return null;
  }

  return checkDate;
}
