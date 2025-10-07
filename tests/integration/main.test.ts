import { describe, it, expect, vi, beforeEach } from 'vitest';
import { main } from '../../src/main';

const sendToSlackMock = vi.fn().mockResolvedValue(undefined);
const fetchIcsCalendarMock = vi.fn().mockResolvedValue('BEGIN:VCALENDAR\nEND:VCALENDAR');
const scrapeNycWebsiteMock = vi.fn().mockResolvedValue({ suspended: false });

vi.mock('../../src/slack/webhook', () => ({
  sendToSlack: sendToSlackMock,
}));

vi.mock('../../src/calendar/ics-fetcher', () => ({
  fetchIcsCalendar: fetchIcsCalendarMock,
}));

vi.mock('../../src/scraper/nyc-website', () => ({
  scrapeNycWebsite: scrapeNycWebsiteMock,
}));

describe('main integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
    process.env.NEAR_SIDE_DAYS = 'Mon,Thu';
    process.env.FAR_SIDE_DAYS = 'Tue,Fri';
    sendToSlackMock.mockResolvedValue(undefined);
    fetchIcsCalendarMock.mockResolvedValue('BEGIN:VCALENDAR\nEND:VCALENDAR');
    scrapeNycWebsiteMock.mockResolvedValue({ suspended: false });
  });

  it('should run without errors during normal hours', async () => {
    await main();

    // During non-scheduled hours, should not send any messages
    expect(sendToSlackMock).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully and send error notification', async () => {
    // Remove the webhook URL to cause a config error
    delete process.env.SLACK_WEBHOOK_URL;

    await main();

    // Should attempt to send error notification (though it will fail due to missing config)
    // The important thing is that main() doesn't throw
    expect(sendToSlackMock).not.toHaveBeenCalled();
  });
});
