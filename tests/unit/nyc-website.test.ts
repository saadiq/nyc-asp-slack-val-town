import { describe, it, expect } from 'vitest';
import { parseHtmlForSuspension } from '../../src/scraper/nyc-website';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('nyc-website scraper', () => {
  it('should detect suspension from HTML', () => {
    const html = readFileSync(
      join(__dirname, '../fixtures/nyc-suspended.html'),
      'utf-8'
    );

    const result = parseHtmlForSuspension(html);

    expect(result.isSuspendedToday).toBe(true);
    expect(result.reason).toBe('snow');
  });

  it('should detect normal day (not suspended)', () => {
    const html = readFileSync(
      join(__dirname, '../fixtures/nyc-normal.html'),
      'utf-8'
    );

    const result = parseHtmlForSuspension(html);

    expect(result.isSuspendedToday).toBe(false);
    expect(result.reason).toBeUndefined();
  });
});
