// src/parking-logic/suspension-checker.ts
import { getIcsContent } from '../calendar/ics-fetcher';
import { parseIcsSuspensions, isSuspendedByIcs } from '../calendar/ics-parser';
import { scrapeNycWebsite } from '../scraper/nyc-website';
import { isSameDayNyc, getNycNow } from '../utils/date-utils';

let cachedSuspensionDates: string[] = [];
let lastIcsFetch: Date | null = null;

/**
 * Initialize suspension data (fetch ICS on first call or weekly)
 */
async function ensureSuspensionDataLoaded(storage?: any): Promise<void> {
  const now = getNycNow();
  const needsRefresh = !lastIcsFetch ||
    (now.getTime() - lastIcsFetch.getTime()) > 7 * 24 * 60 * 60 * 1000;

  if (needsRefresh) {
    const icsContent = await getIcsContent(false, storage);
    cachedSuspensionDates = parseIcsSuspensions(icsContent);
    lastIcsFetch = now;
  }
}

/**
 * Check if a specific date has ASP suspended
 * Combines ICS calendar data + website scraping for today
 */
export async function isSuspended(
  date: Date,
  storage?: any
): Promise<{ suspended: boolean; reason?: string }> {
  await ensureSuspensionDataLoaded(storage);

  // Check ICS calendar first
  if (isSuspendedByIcs(date, cachedSuspensionDates)) {
    return { suspended: true, reason: 'holiday' };
  }

  // For today only, check website for emergency suspensions
  const today = getNycNow();
  if (isSameDayNyc(date, today)) {
    try {
      const scrapeResult = await scrapeNycWebsite();
      if (scrapeResult.isSuspendedToday) {
        return {
          suspended: true,
          reason: scrapeResult.reason || 'emergency'
        };
      }
    } catch (error) {
      console.error('Failed to scrape website, using ICS data only:', error);
      // Fall through to return ICS result
    }
  }

  return { suspended: false };
}

/**
 * Get all suspension dates from ICS (for week view)
 */
export async function getSuspensionDates(storage?: any): Promise<string[]> {
  await ensureSuspensionDataLoaded(storage);
  return cachedSuspensionDates;
}

/**
 * Reset cache (for testing purposes)
 */
export function resetCache(): void {
  cachedSuspensionDates = [];
  lastIcsFetch = null;
}
