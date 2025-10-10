// src/calendar/ics-fetcher.ts
import { retry } from '../utils/retry';
import { CalendarCache } from '../types';

const ICS_URL_TEMPLATE = 'https://www.nyc.gov/html/dot/downloads/misc/{year}-alternate-side.ics';
const CACHE_KEY = 'nyc-asp-calendar-cache';

// In Val Town, use @std/blob for storage. For local dev, use in-memory cache.
let memoryCache: CalendarCache | null = null;
let valBlobCache: any = undefined; // undefined = not checked, null = not available, object = available

/**
 * Get Val Town blob storage if available
 * In Val Town environment, this will import the blob module
 * In local dev, returns null and we'll use in-memory cache
 */
async function getValBlob() {
  // Return cached result if we've already checked
  if (valBlobCache !== undefined) {
    return valBlobCache;
  }

  try {
    // @ts-ignore - Val Town specific import
    const blobModule = await import('https://esm.town/v/std/blob');
    valBlobCache = blobModule.blob;
    return valBlobCache;
  } catch {
    // Val Town blob not available (expected in local dev)
    valBlobCache = null;
    return null;
  }
}

/**
 * Fetch the ICS calendar file for a given year
 */
export async function fetchIcsFile(year: number): Promise<string> {
  const url = ICS_URL_TEMPLATE.replace('{year}', year.toString());

  const response = await retry(
    async () => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch ICS: ${res.status} ${res.statusText}`);
      }
      return res;
    },
    { maxAttempts: 3, initialDelayMs: 1000 }
  );

  return await response.text();
}

/**
 * Get ICS content, using cache if available and fresh
 */
export async function getIcsContent(
  forceRefresh: boolean = false
): Promise<string> {
  // Get current year in NYC timezone to handle New Year's Eve edge case
  const { getNycNow, formatNycDate } = await import('../utils/date-utils');
  const currentYear = parseInt(formatNycDate(getNycNow(), 'yyyy'), 10);

  // Check cache first (unless forcing refresh)
  if (!forceRefresh) {
    const cached = await getCachedCalendar();
    if (cached && cached.icsContent && isCacheFresh(cached)) {
      console.log('Using cached ICS calendar');
      return cached.icsContent;
    }
  }

  // Fetch fresh data
  console.log('Fetching fresh ICS calendar');
  const icsContent = await fetchIcsFile(currentYear);

  // Update cache
  await setCachedCalendar({ icsContent, fetchedAt: new Date() });

  return icsContent;
}

/**
 * Check if cached data is still fresh (less than 7 days old)
 */
function isCacheFresh(cache: Partial<CalendarCache>): boolean {
  if (!cache.fetchedAt) return false;

  const age = Date.now() - new Date(cache.fetchedAt).getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  return age < sevenDays;
}

/**
 * Get cached calendar from storage
 */
async function getCachedCalendar(): Promise<Partial<CalendarCache> | null> {
  const blob = await getValBlob();

  if (blob) {
    // Val Town blob storage
    try {
      const cached = await blob.getJSON(CACHE_KEY);
      return cached || null;
    } catch {
      return null;
    }
  }

  // In-memory cache for local dev
  return memoryCache;
}

/**
 * Save calendar to cache
 */
async function setCachedCalendar(
  cache: Partial<CalendarCache>
): Promise<void> {
  const blob = await getValBlob();

  if (blob) {
    // Val Town blob storage
    await blob.setJSON(CACHE_KEY, cache);
  } else {
    // In-memory cache for local dev
    memoryCache = cache as CalendarCache;
  }
}
