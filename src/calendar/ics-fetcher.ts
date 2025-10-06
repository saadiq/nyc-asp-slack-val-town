// src/calendar/ics-fetcher.ts
import { retry } from '../utils/retry';
import { CalendarCache } from '../types';

const ICS_URL_TEMPLATE = 'https://www.nyc.gov/html/dot/downloads/misc/{year}-alternate-side.ics';
const CACHE_KEY = 'nyc-asp-calendar-cache';

// In Val Town, use @std/blob for storage. For local dev, use in-memory cache.
let memoryCache: CalendarCache | null = null;

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
  forceRefresh: boolean = false,
  storage?: any // Val Town blob storage
): Promise<string> {
  const currentYear = new Date().getFullYear();

  // Check cache first (unless forcing refresh)
  if (!forceRefresh) {
    const cached = await getCachedCalendar(storage);
    if (cached && isCacheFresh(cached)) {
      console.log('Using cached ICS calendar');
      return cached.icsContent;
    }
  }

  // Fetch fresh data
  console.log('Fetching fresh ICS calendar');
  const icsContent = await fetchIcsFile(currentYear);

  // Update cache
  await setCachedCalendar({ icsContent, fetchedAt: new Date() }, storage);

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
async function getCachedCalendar(storage?: any): Promise<Partial<CalendarCache> | null> {
  if (storage) {
    // Val Town blob storage
    try {
      const blob = await storage.getJSON(CACHE_KEY);
      return blob || null;
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
  cache: Partial<CalendarCache>,
  storage?: any
): Promise<void> {
  if (storage) {
    // Val Town blob storage
    await storage.setJSON(CACHE_KEY, cache);
  } else {
    // In-memory cache for local dev
    memoryCache = cache as CalendarCache;
  }
}
