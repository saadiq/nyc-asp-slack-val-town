import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isSuspended, getSuspensionDates, resetCache } from '../../src/parking-logic/suspension-checker';
import * as icsFetcher from '../../src/calendar/ics-fetcher';
import * as icsParser from '../../src/calendar/ics-parser';
import * as scraper from '../../src/scraper/nyc-website';
import * as dateUtils from '../../src/utils/date-utils';

describe('suspension-checker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    resetCache();
  });

  it('should detect ICS suspension', async () => {
    vi.spyOn(icsFetcher, 'getIcsContent').mockResolvedValue('ICS_CONTENT');
    vi.spyOn(icsParser, 'parseIcsSuspensions').mockReturnValue(['2025-12-25']);
    vi.spyOn(icsParser, 'isSuspendedByIcs').mockReturnValue(true);

    const christmas = new Date('2025-12-25T12:00:00');
    const result = await isSuspended(christmas);

    expect(result.suspended).toBe(true);
    expect(result.reason).toBe('holiday');
  });

  it('should detect emergency suspension from website for today', async () => {
    // Mock today as Oct 6, 2025
    const today = new Date('2025-10-06T12:00:00');
    vi.spyOn(dateUtils, 'getNycNow').mockReturnValue(today);
    vi.spyOn(dateUtils, 'isSameDayNyc').mockReturnValue(true);

    vi.spyOn(icsFetcher, 'getIcsContent').mockResolvedValue('ICS_CONTENT');
    vi.spyOn(icsParser, 'parseIcsSuspensions').mockReturnValue([]);
    vi.spyOn(icsParser, 'isSuspendedByIcs').mockReturnValue(false);
    vi.spyOn(scraper, 'scrapeNycWebsite').mockResolvedValue({
      isSuspendedToday: true,
      reason: 'snow',
      scrapedAt: new Date(),
    });

    const result = await isSuspended(today);

    expect(result.suspended).toBe(true);
    expect(result.reason).toBe('snow');
  });

  it('should return false when not suspended', async () => {
    vi.spyOn(icsFetcher, 'getIcsContent').mockResolvedValue('ICS_CONTENT');
    vi.spyOn(icsParser, 'parseIcsSuspensions').mockReturnValue([]);
    vi.spyOn(icsParser, 'isSuspendedByIcs').mockReturnValue(false);

    const regularDay = new Date('2025-10-15T12:00:00');
    const result = await isSuspended(regularDay);

    expect(result.suspended).toBe(false);
    expect(result.reason).toBeUndefined();
  });

  it('should handle scraper errors gracefully', async () => {
    const today = new Date('2025-10-06T12:00:00');
    vi.spyOn(dateUtils, 'getNycNow').mockReturnValue(today);
    vi.spyOn(dateUtils, 'isSameDayNyc').mockReturnValue(true);

    vi.spyOn(icsFetcher, 'getIcsContent').mockResolvedValue('ICS_CONTENT');
    vi.spyOn(icsParser, 'parseIcsSuspensions').mockReturnValue([]);
    vi.spyOn(icsParser, 'isSuspendedByIcs').mockReturnValue(false);
    vi.spyOn(scraper, 'scrapeNycWebsite').mockRejectedValue(new Error('Network error'));

    const result = await isSuspended(today);

    // Should fall back to ICS data only
    expect(result.suspended).toBe(false);
  });

  it('should return suspension dates from cache', async () => {
    vi.spyOn(icsFetcher, 'getIcsContent').mockResolvedValue('ICS_CONTENT');
    vi.spyOn(icsParser, 'parseIcsSuspensions').mockReturnValue(['2025-12-25', '2025-01-01']);

    const dates = await getSuspensionDates();

    expect(dates).toEqual(['2025-12-25', '2025-01-01']);
  });
});
