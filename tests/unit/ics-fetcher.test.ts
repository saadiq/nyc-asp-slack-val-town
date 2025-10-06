import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchIcsFile } from '../../src/calendar/ics-fetcher';

// Mock fetch globally
global.fetch = vi.fn();

describe('ics-fetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch ICS file successfully', async () => {
    const mockIcsContent = 'BEGIN:VCALENDAR\\nEND:VCALENDAR';

    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: async () => mockIcsContent,
    });

    const result = await fetchIcsFile(2025);

    expect(result).toBe(mockIcsContent);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://www.nyc.gov/html/dot/downloads/misc/2025-alternate-side.ics'
    );
  });

  it('should throw error on failed fetch', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(fetchIcsFile(2025)).rejects.toThrow('Failed to fetch ICS');
  });
});
