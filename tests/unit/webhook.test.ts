import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendToSlack } from '../../src/slack/webhook';

global.fetch = vi.fn();

describe('webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send message successfully', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: async () => 'ok',
    });

    await sendToSlack('https://hooks.slack.com/test', { text: 'test' });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://hooks.slack.com/test',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('should throw error on failed request', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Error details',
    });

    await expect(
      sendToSlack('https://hooks.slack.com/test', { text: 'test' })
    ).rejects.toThrow('Slack webhook failed');
  });
});
