// src/parking-logic/week-analyzer.ts
import { Config, DayStatus, WeekView, Side } from '../types';
import { getWeekdays, getDayOfWeek, getThisMonday, getThisFriday } from '../utils/date-utils';
import { isSuspended } from './suspension-checker';

/**
 * Build week view with parking status for each day
 */
export async function buildWeekView(
  config: Config,
  referenceDate?: Date
): Promise<WeekView> {
  const weekdays = getWeekdays(referenceDate);
  const days: DayStatus[] = [];

  for (const date of weekdays) {
    const dayOfWeek = getDayOfWeek(date);

    // Check if this day has street cleaning on each side
    const hasNearSideCleaning = config.nearSideDays.includes(dayOfWeek);
    const hasFarSideCleaning = config.farSideDays.includes(dayOfWeek);

    // Check if suspended
    const { suspended, reason } = await isSuspended(date);

    // Determine where car should be parked
    const parkOnSide = determineParkingSide(
      hasNearSideCleaning,
      hasFarSideCleaning,
      suspended
    );

    days.push({
      date,
      dayOfWeek,
      hasNearSideCleaning,
      hasFarSideCleaning,
      isSuspended: suspended,
      suspensionReason: reason,
      parkOnSide,
    });
  }

  return {
    startDate: getThisMonday(referenceDate),
    endDate: getThisFriday(referenceDate),
    days,
  };
}

/**
 * Determine which side to park on based on cleaning schedule
 *
 * Logic: Park on the side that does NOT have cleaning today
 * If suspended: Stay on the side that protects you for the next cleaning day
 */
function determineParkingSide(
  hasNearSideCleaning: boolean,
  hasFarSideCleaning: boolean,
  isSuspended: boolean
): Side | null {
  // If suspended, we need context of the week to decide
  // For now, return null for suspended days (will be filled in by week-level logic)
  if (isSuspended) {
    return null;
  }

  // Park on opposite side of cleaning
  if (hasNearSideCleaning) return 'far';
  if (hasFarSideCleaning) return 'near';

  // No cleaning today (e.g., Wednesday)
  return null;
}

/**
 * Fill in parking sides for suspended/no-cleaning days
 * Strategy: Stay on current side to prepare for next cleaning day
 */
export function optimizeParkingSides(weekView: WeekView): WeekView {
  const days = [...weekView.days];

  for (let i = 0; i < days.length; i++) {
    if (days[i].parkOnSide !== null) continue;

    // Find next day with cleaning
    const nextCleaningDay = findNextDayWithCleaning(days, i);

    if (nextCleaningDay) {
      // Park on the side needed for next cleaning
      days[i].parkOnSide = nextCleaningDay.parkOnSide;
    } else {
      // No more cleaning this week, stay on current side
      // Look back to find current side
      const prevDay = findPreviousDay(days, i);
      days[i].parkOnSide = prevDay?.parkOnSide || 'far';
    }
  }

  return { ...weekView, days };
}

function findNextDayWithCleaning(days: DayStatus[], startIndex: number): DayStatus | null {
  for (let i = startIndex + 1; i < days.length; i++) {
    if (days[i].parkOnSide !== null) {
      return days[i];
    }
  }
  return null;
}

function findPreviousDay(days: DayStatus[], startIndex: number): DayStatus | null {
  for (let i = startIndex - 1; i >= 0; i--) {
    if (days[i].parkOnSide !== null) {
      return days[i];
    }
  }
  return null;
}
