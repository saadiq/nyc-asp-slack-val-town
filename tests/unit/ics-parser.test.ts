import { describe, it, expect } from 'vitest';
import { parseIcsSuspensions, isSuspendedByIcs } from '../../src/calendar/ics-parser';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('ics-parser', () => {
  const sampleIcs = readFileSync(
    join(__dirname, '../fixtures/sample.ics'),
    'utf-8'
  );

  it('should parse suspension dates from ICS', () => {
    const dates = parseIcsSuspensions(sampleIcs);

    expect(dates).toContain('2025-12-25'); // Christmas
    expect(dates).toContain('2025-11-01'); // Day after Halloween
    expect(dates.length).toBeGreaterThan(0);
  });

  it('should check if date is suspended', () => {
    const dates = parseIcsSuspensions(sampleIcs);

    const christmas = new Date('2025-12-25T12:00:00');
    expect(isSuspendedByIcs(christmas, dates)).toBe(true);

    const regularDay = new Date('2025-10-15T12:00:00');
    expect(isSuspendedByIcs(regularDay, dates)).toBe(false);
  });

  it('should handle invalid ICS gracefully', () => {
    const invalidIcs = 'NOT A VALID ICS FILE';
    expect(() => parseIcsSuspensions(invalidIcs)).toThrow('ICS parsing failed');
  });
});
