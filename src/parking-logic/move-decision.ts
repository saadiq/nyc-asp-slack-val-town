// src/parking-logic/move-decision.ts
import { Config, WeekView, DayStatus, MoveDecision, Side } from '../types';
import { getNycNow, getDayOfWeek, isSameDayNyc } from '../utils/date-utils';

/**
 * Determine if a move reminder should be sent today at 10 AM
 *
 * Logic:
 * 1. Is today a cleaning day (not suspended)?
 * 2. Where is the car now? (opposite of today's cleaning)
 * 3. What's the next cleaning day?
 * 4. Do we need to switch sides?
 * 5. Is it Friday? (skip - weekend coming)
 */
export function shouldSendMoveReminder(
  weekView: WeekView,
  config: Config
): MoveDecision {
  const today = getNycNow();
  const todayStatus = weekView.days.find(d => isSameDayNyc(d.date, today));

  console.log('[Move Decision] Today:', todayStatus?.dayOfWeek);

  if (!todayStatus) {
    console.log('[Move Decision] No today status found');
    return { shouldMove: false };
  }

  // Not a cleaning day? No move needed
  if (!todayStatus.hasNearSideCleaning && !todayStatus.hasFarSideCleaning) {
    console.log('[Move Decision] Not a cleaning day');
    return { shouldMove: false };
  }

  // Suspended today? No move needed
  if (todayStatus.isSuspended) {
    console.log('[Move Decision] Suspended today');
    return { shouldMove: false };
  }

  // Is it Friday? Skip (weekend coming)
  if (todayStatus.dayOfWeek === 'Fri') {
    console.log('[Move Decision] Friday - skipping');
    return { shouldMove: false };
  }

  // Where is car now? (opposite of today's cleaning)
  const currentSide: Side = todayStatus.hasNearSideCleaning ? 'far' : 'near';
  console.log('[Move Decision] Current side:', currentSide);

  // Find next cleaning day
  const nextCleaningDay = findNextCleaningDay(weekView, todayStatus);
  console.log('[Move Decision] Next cleaning day:', nextCleaningDay?.dayOfWeek, 'parkOn:', nextCleaningDay?.parkOnSide);

  if (!nextCleaningDay) {
    // No more cleaning this week
    console.log('[Move Decision] No next cleaning day found');
    return { shouldMove: false };
  }

  // What side do we need for next cleaning?
  const targetSide = nextCleaningDay.parkOnSide;

  if (!targetSide || currentSide === targetSide) {
    // Already on correct side
    console.log('[Move Decision] Already on correct side. Current:', currentSide, 'Target:', targetSide);
    return { shouldMove: false };
  }

  // Need to move!
  console.log('[Move Decision] NEED TO MOVE! From:', currentSide, 'To:', targetSide);
  return {
    shouldMove: true,
    currentSide,
    targetSide,
    nextMoveDate: nextCleaningDay.date,
  };
}

/**
 * Find the next day with active street cleaning
 */
function findNextCleaningDay(
  weekView: WeekView,
  fromDay: DayStatus
): DayStatus | null {
  const fromIndex = weekView.days.findIndex(d =>
    isSameDayNyc(d.date, fromDay.date)
  );

  for (let i = fromIndex + 1; i < weekView.days.length; i++) {
    const day = weekView.days[i];
    if (!day.isSuspended && (day.hasNearSideCleaning || day.hasFarSideCleaning)) {
      return day;
    }
  }

  // Look into next week (Monday only)
  // This handles Friday->Monday transition
  const nextMonday = weekView.days.find(d => d.dayOfWeek === 'Mon');
  if (nextMonday && !nextMonday.isSuspended &&
      (nextMonday.hasNearSideCleaning || nextMonday.hasFarSideCleaning)) {
    return nextMonday;
  }

  return null;
}
