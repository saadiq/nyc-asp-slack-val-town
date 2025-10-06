import { describe, it, expect, beforeEach } from 'vitest';
import { loadConfig } from '../../src/config';

describe('loadConfig', () => {
  beforeEach(() => {
    // Reset env vars before each test
    delete process.env.SLACK_WEBHOOK_URL;
  });

  it('should throw error if SLACK_WEBHOOK_URL is missing', () => {
    expect(() => loadConfig()).toThrow('Missing required environment variable: SLACK_WEBHOOK_URL');
  });

  it('should use default values when optional vars are not set', () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
    const config = loadConfig();

    expect(config.nearSideDays).toEqual(['Mon', 'Thu']);
    expect(config.farSideDays).toEqual(['Tue', 'Fri']);
    expect(config.nearSideEmoji).toBe('🏠');
  });

  it('should parse custom day configuration', () => {
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
    process.env.NEAR_SIDE_DAYS = 'Mon,Wed,Fri';

    const config = loadConfig();
    expect(config.nearSideDays).toEqual(['Mon', 'Wed', 'Fri']);
  });
});
