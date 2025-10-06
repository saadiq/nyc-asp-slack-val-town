// src/calendar/ics-parser.ts
import ICAL from 'ical.js';
import { toIsoDateString } from '../utils/date-utils';

/**
 * Parse ICS content and extract suspension dates
 * Returns array of ISO date strings (YYYY-MM-DD)
 */
export function parseIcsSuspensions(icsContent: string): string[] {
  try {
    const jcalData = ICAL.parse(icsContent);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');

    const suspensionDates: Set<string> = new Set();

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent);
      const summary = event.summary.toLowerCase();

      // Check if event indicates ASP suspension
      if (isSuspensionEvent(summary)) {
        const startDate = event.startDate.toJSDate();
        suspensionDates.add(toIsoDateString(startDate));
      }
    }

    return Array.from(suspensionDates).sort();
  } catch (error) {
    console.error('Failed to parse ICS:', error);
    throw new Error(`ICS parsing failed: ${error}`);
  }
}

/**
 * Determine if event summary indicates ASP is suspended
 */
function isSuspensionEvent(summary: string): boolean {
  const suspensionKeywords = [
    'asp suspended',
    'alternate side parking suspended',
    'no asp',
    'suspended',
  ];

  return suspensionKeywords.some(keyword => summary.includes(keyword));
}

/**
 * Check if a specific date is suspended according to ICS data
 */
export function isSuspendedByIcs(
  date: Date,
  suspensionDates: string[]
): boolean {
  const dateStr = toIsoDateString(date);
  return suspensionDates.includes(dateStr);
}
