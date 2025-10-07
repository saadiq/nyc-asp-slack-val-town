// tests/integration/e2e.test.ts
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { main } from '../../src/main';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dateUtils from '../../src/utils/date-utils';

// Setup mocks
vi.mock('../../src/calendar/ics-fetcher', () => ({
  getIcsContent: vi.fn().mockResolvedValue(
    readFileSync(join(__dirname, '../fixtures/sample.ics'), 'utf-8')
  ),
}));

vi.mock('../../src/scraper/nyc-website', () => ({
  scrapeNycWebsite: vi.fn().mockResolvedValue({
    isSuspendedToday: false,
    scrapedAt: new Date(),
  }),
}));

const mockSendToSlack = vi.fn().mockResolvedValue(undefined);
vi.mock('../../src/slack/webhook', () => ({
  sendToSlack: mockSendToSlack,
}));

describe('E2E Integration Test', () => {
  beforeAll(() => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
    process.env.NEAR_SIDE_DAYS = 'Mon,Thu';
    process.env.FAR_SIDE_DAYS = 'Tue,Fri';
  });

  beforeEach(() => {
    mockSendToSlack.mockClear();
  });

  it('should run main without errors', async () => {
    await main();
    // If we get here without throwing, the test passes
    expect(true).toBe(true);
  });

  it('should generate valid Slack messages', async () => {
    // Mock Sunday 5 AM NYC time
    const sundayDate = new Date('2025-10-05T05:00:00');
    const getNycNowSpy = vi.spyOn(dateUtils, 'getNycNow').mockReturnValue(sundayDate);

    await main();

    // Should have sent weekly summary
    expect(mockSendToSlack).toHaveBeenCalled();
    const message = mockSendToSlack.mock.calls[0][1];
    expect(message.blocks).toBeDefined();
    expect(message.blocks[0].text.text).toContain('Parking Strategy');

    getNycNowSpy.mockRestore();
  });
});
